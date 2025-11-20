from sqlalchemy.orm import Session
from sqlalchemy import asc, desc

from . import models, schemas


# ---------- TASKS ----------

def get_task(db: Session, task_id: int):
    """Return a single task by id, or None."""
    return db.query(models.Task).filter(models.Task.id == task_id).first()


def create_task(db: Session, data: schemas.TaskCreate):
    """Insert a new task."""
    row = models.Task(**data.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def update_task(db: Session, task_id: int, data: schemas.TaskUpdate):
    """Patch/Update an existing task."""
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        return None

    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(task, k, v)

    db.commit()
    db.refresh(task)
    return task


def delete_task(db: Session, task_id: int) -> bool:
    """Delete task by id. Return True if deleted, False if not found."""
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        return False

    db.delete(task)
    db.commit()
    return True


def list_tasks(
    db: Session,
    status: str | None = None,
    assigned_to: str | None = None,
    q: str | None = None,
    limit: int = 50,
    offset: int = 0,
    sort_by: str = "id",
    order: str = "asc",
):
    """List tasks with optional filters + sorting + pagination."""
    query = db.query(models.Task)

    if status:
        query = query.filter(models.Task.status == status)

    if assigned_to:
        query = query.filter(models.Task.assigned_to == assigned_to)

    if q:
        like = f"%{q.lower()}%"
        query = query.filter(models.Task.task_name.ilike(like))

    sort_map = {
        "id": models.Task.id,
        "task_name": models.Task.task_name,
        "status": models.Task.status,
        "start_date": models.Task.start_date,
        "end_date": models.Task.end_date,
        "priority": models.Task.priority,
    }

    col = sort_map.get(sort_by, models.Task.id)
    direction = asc if order.lower() != "desc" else desc

    return query.order_by(direction(col)).offset(offset).limit(limit).all()


# ---------- COMMENTS ----------

def get_comments_for_task(db: Session, task_id: int):
    return (
        db.query(models.Comment)
        .filter(models.Comment.task_id == task_id)
        .order_by(models.Comment.created_at.asc())
        .all()
    )


def create_comment_for_task(
    db: Session, task_id: int, comment_in: schemas.CommentCreate
):
    db_comment = models.Comment(
        task_id=task_id,
        text=comment_in.text,
        author=comment_in.author,
    )
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    return db_comment

# ---------- ATTACHMENTS ----------

def get_attachments_for_task(db: Session, task_id: int):
    return (
        db.query(models.Attachment)
        .filter(models.Attachment.task_id == task_id)
        .order_by(models.Attachment.uploaded_at.asc())
        .all()
    )


def get_attachment(db: Session, attachment_id: int):
    return (
        db.query(models.Attachment)
        .filter(models.Attachment.id == attachment_id)
        .first()
    )

def add_attachment(db: Session, task_id: int, filename: str, filepath: str):
    att = models.Attachment(
        task_id=task_id,
        filename=filename,
        filepath=filepath
    )
    db.add(att)
    db.commit()
    db.refresh(att)
    return att

def get_attachments(db: Session, task_id: int):
    return (
        db.query(models.Attachment)
        .filter(models.Attachment.task_id == task_id)
        .order_by(models.Attachment.uploaded_at.desc())
        .all()
    )


# ---------- USERS ----------

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()


def create_user(db: Session, user_in: schemas.UserCreate, hashed_password: str):
    user = models.User(
        username=user_in.username,
        hashed_password=hashed_password,
        role=user_in.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
