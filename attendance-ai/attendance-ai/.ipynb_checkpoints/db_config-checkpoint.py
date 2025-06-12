from sqlalchemy import create_engine

def get_connection():
    # Replace with your actual credentials
    connection_string = "mysql+pymysql://root:@127.0.0.1:3306/pfe"
    engine = create_engine(connection_string)
    return engine.connect()
