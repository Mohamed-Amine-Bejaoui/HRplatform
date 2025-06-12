import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from db_config import get_connection
from datetime import datetime

def fetch_data():
    conn = get_connection()
    query = """
    SELECT a.emp_num_aux, a.check_in, a.check_out, p.planned_status, a.work_date
    FROM attendance_logs a
    JOIN work_schedule p ON a.emp_num_aux = p.emp_num_aux AND a.work_date = p.work_date;
    """
    try:
        df = pd.read_sql(query, conn)
    finally:
        conn.close()
    return df

def preprocess(df):
    # Convert datetime fields
    df['check_in'] = pd.to_datetime(df['check_in'], errors='coerce')
    df['check_out'] = pd.to_datetime(df['check_out'], errors='coerce')
    
    # Calculate worked hours only when both times are present
    df['worked_hours'] = np.where(
        df['check_in'].notna() & df['check_out'].notna(),
        (df['check_out'] - df['check_in']).dt.total_seconds() / 3600,
        0  # Default to 0 hours if missing
    )
    
    # Extract features
    df['weekday'] = df['check_in'].dt.dayofweek.fillna(-1)  # -1 if missing
    df['is_late'] = (df['check_in'].dt.hour > 9) & df['check_in'].notna()
    df['was_absent'] = df['check_in'].isna() & df['planned_status'].isin(['Working day'])
    
    # Map planned_status to match alerts enum
    status_map = {
        'weekend':'w',
        "Working day":'ok' ,
        "Vacations" :'V',
        "Recovery":'R' ,
        "Public Holiday":'P',
        "Home Office":'HO',
        "paid Permission": 'L' ,
        "Sickness":"S",
        "Half-Day":"HD" ,
        "Training":"T",
        "Business Trip":'BT',
        "Relatives Death":'F',
        "Marriage":"M" ,
    }
    df['expected_status'] = df['planned_status'].map(status_map).fillna('OK')  # Default to 'OK' if missing
    
    # Encode categorical features
    df['planned_status_encoded'] = df['planned_status'].astype('category').cat.codes
    
    return df

def detect_anomalies(df):
    # Select relevant features for anomaly detection
    features = df[['worked_hours', 'weekday', 'is_late', 'planned_status_encoded']].fillna(0)
    
    # Train Isolation Forest model
    model = IsolationForest(contamination=0.1, random_state=42)
    model.fit(features)
    
    # Predict anomalies (-1 = anomaly)
    df['anomaly'] = model.predict(features)
    
    # Return only anomalies
    return df[df['anomaly'] == -1]

def save_alerts(anomalies):
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        for _, row in anomalies.iterrows():
            # Convert NaN values to appropriate defaults
            emp_num = str(row['emp_num_aux']) if pd.notna(row['emp_num_aux']) else 'UNKNOWN'
            worked_hours = float(row['worked_hours']) if pd.notna(row['worked_hours']) else 0.0
            is_late = bool(row['is_late']) if pd.notna(row['is_late']) else False
            was_absent = bool(row['was_absent']) if pd.notna(row['was_absent']) else False
            
            # Determine actual status
            if was_absent:
                actual_status = 'absent'
            elif is_late:
                actual_status = 'late'
            elif worked_hours < 9:
                actual_status = 'left_early',    
            else :
                actual_status = 'on_site'
            
            # Create alert message
            alert_message = (
                f"Anomaly detected: Employee {emp_num} - "
                f"Worked hours: {worked_hours:.2f}, "
                f"Late: {'Yes' if is_late else 'No'}, "
                f"Absent: {'Yes' if was_absent else 'No'}"
            )
            
            # Get detection date (use work_date if check_in is null)
            detected_date = row['check_in'].date() if pd.notna(row['check_in']) else row['work_date']
            if pd.isna(detected_date):
                detected_date = datetime.now().date()
            
            expected_status = row['expected_status'] if pd.notna(row['expected_status']) else 'OK'
            
            # Insert alert
            cursor.execute(
                "INSERT INTO alerts (emp_num_aux, detected_on, expected_status, actual_status, alert_message, resolved) "
                "VALUES (%s, %s, %s, %s, %s, %s)",
                (emp_num, detected_date, expected_status, actual_status, alert_message, 0)
            )

        conn.commit()
    except Exception as e:
        print(f"Error saving alerts: {str(e)}")
        if conn:
            conn.rollback()
        raise
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    print("Starting anomaly detection process...")
    
    try:
        # Step 1: Fetch data
        print("Fetching data from database...")
        df = fetch_data()
        
        if df.empty:
            print("No data found in database.")
            exit()
        
        # Step 2: Preprocess data
        print("Preprocessing data...")
        df = preprocess(df)
        
        # Step 3: Detect anomalies
        print("Detecting anomalies...")
        anomalies = detect_anomalies(df)
        
        # Step 4: Save alerts
        print(f"Found {len(anomalies)} anomalies. Saving alerts...")
        if not anomalies.empty:
            save_alerts(anomalies)
            print("Alerts saved successfully!")
        else:
            print("No zebi to save.")
        
        print("Process zebi successfully!")
    except Exception as e:
        print(f"An error occurred: {str(e)}")
