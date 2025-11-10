from pydantic import BaseModel, Field
from datetime import date
from enum import Enum

#allowed statuses
class StatusEnum(str, Enum):
    considered = "Considered"
    investigation = "Investigation"
    ready_to_development = "Ready To Development"
    under_development = "Under Development"
    code_review = "Code Review"
    development_completed = "Development Completed"

#Request Schemas
class TaskCreate(BaseModel):
	task_name : str 
	status:StatusEnum = StatusEnum.considered  #default
	assigned_to: str | None = None
	start_date : date|None = None
	end_date : date | None = None
      
#Response Schema
class TaskOut(TaskCreate):
    id: int

    class Config:
        orm_mode = True
        
#Update

class TaskUpdate(BaseModel):
     task_name :str|None = None
     status :str|None = None
     assigned_to :str | None = None
     start_date: date | None = None
     end_date: date | None = None
		
