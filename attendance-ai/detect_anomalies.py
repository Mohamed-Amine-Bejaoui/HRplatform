import pandas as pd
from sqlalchemy import create_engine
from db_config import get_connection
from datetime import datetime
import warnings

warnings.filterwarnings('ignore', category=UserWarning, message='pandas only supports SQLAlchemy')

# Reverse mapping: label (from DB) => enum code
PLANNED_STATUS_CODES = {
    "Working day": "OK",
    "Vacations": "V",
    "Recovery": "R",
    "Public Holiday": "P",
    "Home Office": "HO",
    "paid Permission": "L",
    "Sickness": "S",
    "Half-Day": "HD",
    "Training": "T",
    "Business Trip": "BT",
    "Relatives Death": "F",
    "Marriage": "M"
}

def fetch_anomalies():
    """Get anomaly logs with their schedule"""
    conn = get_connection()
    query = """
        SELECT a.emp_id, a.name, a.date as work_date, a.anomaly, a.check_in_actual, a.check_out_actual,
               p.planned_status
        FROM attendance_logs2 a
        JOIN work_schedule p ON a.emp_id = p.emp_num_aux AND a.date = p.work_date
        WHERE a.anomaly IS NOT NULL
        ORDER BY a.date DESC
        LIMIT 1000;
    """
    df = pd.read_sql(query, conn)
    conn.close()
    print(f"Fetched {len(df)} anomaly records.")
    return df

def classify_alerts(df):
    """Classify anomalies into alert categories"""
    if df.empty:
        return pd.DataFrame()

    def get_status(row):
        label = row['planned_status']
        anomaly = row['anomaly']
        check_in = row['check_in_actual']
        check_out = row['check_out_actual']
        expected = PLANNED_STATUS_CODES.get(label)

        if not expected:
            print("Skipped: Unknown planned_status label.")
            return None, None, None

        # ✅ PRIORITY: Unexpected presence (non-working day but present)
        if expected in ['S', 'HO', 'V', 'R', 'P', 'L', 'T', 'F', 'M']:
            if pd.notna(check_in) or pd.notna(check_out):
                return expected, 'on_site', f"Unexpected presence "

        # Absence handling
        if anomaly == 'Absence':
            if expected == 'OK':
                return 'OK', 'absent', 'Inapproved absence'
            else:
                return expected, 'absent', f"Approved absence: {label}"

        # Late arrival
        elif anomaly == 'Late Arrival':
            if pd.notna(check_in):
                total_seconds = check_in.total_seconds()
                hours = int(total_seconds // 3600)
                minutes = int((total_seconds % 3600) // 60)
                seconds = int(total_seconds % 60)
                return 'OK', 'late', f"Late arrival at {hours:02}:{minutes:02}:{seconds:02}"
            else:
                return 'OK', 'late', "Late arrival with missing time"

        # Short shift
        elif anomaly == 'Short Shift':
            if pd.notna(check_in) and pd.notna(check_out):
                work_duration = check_out - check_in
                total_seconds = work_duration.total_seconds()
                hours = int(total_seconds // 3600)
                minutes = int((total_seconds % 3600) // 60)
                seconds = int(total_seconds % 60)
                duration_str = f"{hours:02}:{minutes:02}:{seconds:02}"
                return 'OK', 'left_early', f"Short shift: worked only {duration_str}"
            else:
                return 'OK', 'left_early', "Short shift with missing time data"

        print("Skipped: Anomaly not classified")
        return None, None, None

    df[['expected_status', 'actual_status', 'anomaly']] = df.apply(
        lambda row: pd.Series(get_status(row)), axis=1
    )

    alerts = df[df['actual_status'].notna()].copy()
    print(f"Classified {len(alerts)} alerts.")
    return alerts

def save_alerts(alerts):
    """Insert alerts into DB"""
    if alerts.empty:
        print("No alerts to save.")
        return

    conn = get_connection()
    cursor = conn.cursor()

    data = []
    for _, row in alerts.iterrows():
        data.append((
            row['emp_id'],
            pd.to_datetime(row['work_date']).date(),
            row['expected_status'],
            row['actual_status'],
            row['anomaly'],
            0  # unresolved
        ))

    cursor.executemany("""
        INSERT IGNORE INTO alerts (emp_num_aux, detected_on, expected_status, actual_status, anomaly, resolved)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, data)
    conn.commit()
    conn.close()
    print(f"Saved {len(data)} alerts to database.")

if __name__ == '__main__':
    print("Running simplified anomaly alert system...")
    start = datetime.now()

    try:
        df = fetch_anomalies()
        alerts = classify_alerts(df)
        save_alerts(alerts)
    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        duration = (datetime.now() - start).total_seconds()
        print(f"Finished in {duration:.2f} seconds")
