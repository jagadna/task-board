from sqlalchemy.orm import Session
from . import models,schemas

def get_tasks(db: Session, task_id:int):
	return db.query(models.Task).filter(models.Task.id == task_id).first()

def add_task(db: Session ,data : schemas.TaskCreate):
	row = models.Task(**data.dict())
	db.add(row)
	db.commit()
	db.refresh(row)
	return row

def update_task(db: Session,task_id:int,data :schemas.TaskUpdate):
	task = db.query(models.Task).filter(models.Task.id == task_id).first()
	if not task:
		return None
	for k,v in data.dict(exclude_unset=True).items():
		setattr(task,k,v)
	db.commit()
	db.refresh(task)
	return task

def delete_task(db:Session,task_id:int)->bool:
	task = db.query(models.Task).filter(models.Task.id == task_id).first()
	if not task:
		return False
	db.delete(task)
	db.commit()
	return True

def list_task(db:Session):
	return db.query(models.Task).order_by(models.Task.id.asc()).all()




