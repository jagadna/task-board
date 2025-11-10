from sqlalchemy import Column, Integer, String, Date, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    task_name: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="Pending")
    assigned_to: Mapped[str | None] = mapped_column(String(100), nullable=True)
    start_date: Mapped[Date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[Date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
