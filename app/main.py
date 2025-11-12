from fastapi import FastAPI ,Depends ,HTTPException,Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from .database import Base,engine,get_db
from . import models, schemas, crud
from typing import List,Optional


Base.metadata.create_all(bind=engine)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/tasks/{task_id}",response_model=schemas.TaskOut)
def get_task_by_id(task_id: int, db:Session = Depends(get_db)):
	task = crud.get_tasks(db,task_id)
	if not task:
		raise HTTPException(status_code=404,detail="Task not found")
	return task

@app.patch("/tasks/{task_id}",response_model = schemas.TaskOut)
def patch_task(task_id:int, payload:schemas.TaskUpdate,db: Session = Depends(get_db)):
	updated = crud.update_task(db,task_id,payload)
	if not  updated:
		raise HTTPException(status_code=404,detail="Task not found")
	return updated

@app.post("/tasks",response_model = schemas.TaskOut, status_code=201)
def create_task(payload : schemas.TaskCreate,db:Session = Depends(get_db)):
	return crud.add_task(db,payload)


@app.delete("/tasks/{task_id}")
def delete_task(task_id: int,db:Session = Depends(get_db)):
	ok = crud.delete_task(db,task_id)
	if not ok:
		raise HTTPException(status_code=404,detail="Task not found")
	return {"deleted" : True ,"id" :  task_id}

@app.get("/tasks",response_model = list[schemas.TaskOut])
def gets_tasks(db:Session = Depends(get_db)):
	return crud.list_task(db)


@app.get("/tasks", response_model=List[schemas.TaskOut])
def get_tasks(
    status: Optional[str] = Query(None),
    assigned_to: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    sort_by: str = Query("id"),
    order: str = Query("asc"),  # asc | desc
    db: Session = Depends(get_db),
):
    return crud.list_tasks(db, status, assigned_to, q, limit, offset, sort_by, order)




	
    

