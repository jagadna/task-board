from sqlalchemy.orm import Session
from . import models,schemas
from sqlalchemy import asc,desc

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


def list_tasks(db:Session,status:str|None = None, assigned_to: str|None = None,q:str
			   |None= None,limit:int=50,offset:int =0,
			   sort_by : str = "id",
			   order : str = "asc"):

	query = db.query(models.Task)
	if status:
		query = query.filter(models.Task.status==status)
	if assigned_to:
		query =  query.filter(models.Task.assigned_to==assigned_to)
	if q:
		like = f"%{q.lower}%"
		query = query.filter(models.Task.task_name.ilike(like))

	sort_map = {
		"id" :models.Task.id,
		"task_name" : models.Task.task_name,
		"status" : models.Task.status,
		"start_date" : models.Task.start_date,
		"end_date" : models.Task.end_date,
		"priority": models.Task.priority, 
	} 
	col = sort_map.get(sort_by,models.Task.id)
	direction = asc if order.lower()!="desc" else desc
	return query.order_by(direction(col)).offset(offset).limit(limit).all()




