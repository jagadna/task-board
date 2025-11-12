from sqlalchemy import Column, Integer, String, Date, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    task_name = Column(String(200), nullable=False)
    status = Column(String(50), nullable=False)
    assigned_to = Column(String(100), nullable=True)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    priority = Column(String(20), nullable=False, default="Medium")