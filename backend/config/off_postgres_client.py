import os
import psycopg2
from dotenv import load_dotenv
from log.logger import log

load_dotenv()

DB_CONFIG = dict(
    host=os.getenv("DB_HOST", "localhost"),
    port=int(os.getenv("DB_PORT", "5433")),
    dbname=os.getenv("DB_NAME", "halalone"),
    user=os.getenv("DB_USER", "halalone_user"),
    password=os.getenv("DB_PASSWORD"),
    connect_timeout=5,
    options="-c statement_timeout=5000",   # server-side: kill a hung query after 5s
    keepalives=1,                          # TCP keepalives so a dead SSH tunnel
    keepalives_idle=10,                    # is detected instead of hanging
    keepalives_interval=5,
    keepalives_count=3,
)


def get_connection():
    """A fresh, short-lived connection per call rather than a pool. The VPS
    is only reachable through an SSH tunnel that drops periodically in dev,
    so a long-lived pool would silently hand out dead connections — a new
    connection with a short timeout fails fast and predictably instead. Once
    the backend runs colocated with Postgres in production, a real pool
    (ThreadedConnectionPool or asyncpg) is worth adding."""
    try:
        return psycopg2.connect(**DB_CONFIG)
    except psycopg2.OperationalError as e:
        log.error("off_postgres.connect_failed", error=str(e), error_type=type(e).__name__)
        raise
