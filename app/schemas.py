from pydantic import BaseModel , Field
from datetime import date, datetime
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
    description: str | None = None

class TaskUpdate(BaseModel):
    task_name: str | None = None
    status: StatusEnum | None = None
    assigned_to: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    priority: PriorityEnum | None = None
    description: str | None = None

class TaskOut(TaskCreate):
    id: int
    class Config:
        orm_mode = True

class CommentBase(BaseModel):
    text: str
    author: str | None = None

class CommentCreate(CommentBase):
    pass

class CommentOut(CommentBase):
    id: int
    task_id: int
    created_at: datetime

    class Config:
        orm_mode = True

class AttachmentOut(BaseModel):
    id: int
    filename: str
    filepath: str
    uploaded_at: datetime

    class Config:
        orm_mode = True

# ---------- USERS & AUTH ----------

class UserBase(BaseModel):
    username: str


class UserCreate(UserBase):
    password: str = Field(..., max_length=72)
    role: str = "user"


class UserOut(UserBase):
    id: int
    role: str

    class Config:
        orm_mode = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    username: str | None = None
