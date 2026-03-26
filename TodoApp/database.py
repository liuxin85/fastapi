from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase


# SQLALCHEMY_DATABASE_URL = 'postgresql://postgres:postgres@localhost/TodoApplicationDatabase'
# SQLALCHEMY_DATABASE_URL = 'mysql+pymysql://root:root@localhost:3306/TodoApplicationDatabase'
SQLALCHEMY_DATABASE_URL = 'sqlite:///./todosapp.db'

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={'check_same_thread': False})

SessionLocal = sessionmaker(autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

