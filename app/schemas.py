from pydantic import BaseModel
from datetime import date
from enum import Enum

class StatusEnum(str, Enum):
    considered = "Considered"
    investigation = "Investigation"
    ready_to_development = "Ready To Development"
    under_development = "Under Development"
    code_review = "Code Review"
    development_completed = "Development Completed"

class PriorityEnum(str, Enum):
    low = "Low"
    medium = "Medium"
    high = "High"
    urgent = "Urgent"

class TaskCreate(BaseModel):
    task_name: str
    status: StatusEnum = StatusEnum.considered
    assigned_to: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    priority: PriorityEnum = PriorityEnum.medium

class TaskUpdate(BaseModel):
    task_name: str | None = None
    status: StatusEnum | None = None
    assigned_to: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    priority: PriorityEnum | None = None

class TaskOut(TaskCreate):
    id: int
    class Config:
        orm_mode = True
