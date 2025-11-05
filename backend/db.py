import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

USER = os.getenv("USER_DB")
PASSWORD = os.getenv("PASSWORD_DB")
HOST = os.getenv("HOST")
PORT = os.getenv("PORT")
DBNAME = os.getenv("DBNAME")

def get_connection():
    """Retourne une nouvelle connexion à la base"""
    return psycopg2.connect(
        user=USER,
        password=PASSWORD,
        host=HOST,
        port=PORT,
        dbname=DBNAME,
        sslmode="require"
    )
