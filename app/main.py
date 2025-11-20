import os
import uuid
import shutil
from datetime import datetime, timedelta

from fastapi import FastAPI, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from . import models, schemas, crud
from typing import List, Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta

from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta




Base.metadata.create_all(bind=engine)


app = FastAPI()
UPLOAD_DIR = "app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- AUTH CONFIG -----------------
SECRET_KEY = "super-secret-key-change-this"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# 🔹 Use pbkdf2_sha256 instead of bcrypt
pwd_context = CryptContext(
    schemes=["pbkdf2_sha256"],
    deprecated="auto",
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def _sanitize_password(password: str) -> str:
    """
    Ensure password is a string. (No 72-byte limit now, but this is safe.)
    """
    if not isinstance(password, str):
        password = str(password)
    return password


def verify_password(plain_password: str, hashed_password: str) -> bool:
    pw = _sanitize_password(plain_password)
    return pwd_context.verify(pw, hashed_password)


def get_password_hash(password: str) -> str:
    pw = _sanitize_password(password)
    return pwd_context.hash(pw)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# ---------------- TASK ENDPOINTS -----------------
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str | None = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = crud.get_user_by_username(db, username)
    if user is None:
        raise credentials_exception

    return user


def get_current_admin_user(current_user: models.User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    return current_user

@app.get("/tasks/{task_id}", response_model=schemas.TaskOut)
def get_task_by_id(task_id: int, db: Session = Depends(get_db)):
    task = crud.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@app.post("/tasks", response_model=schemas.TaskOut, status_code=201)
def create_task(
    payload: schemas.TaskCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user),
):
    return crud.add_task(db, payload)


@app.patch("/tasks/{task_id}", response_model=schemas.TaskOut)
def patch_task(task_id: int, payload: schemas.TaskUpdate, db: Session = Depends(get_db)):
    updated = crud.update_task(db, task_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Task not found")
    return updated


@app.delete("/tasks/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user),
):
    ok = crud.delete_task(db, task_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"deleted": True, "id": task_id}



@app.get("/tasks", response_model=List[schemas.TaskOut])
def list_tasks(
    status: Optional[str] = Query(None),
    assigned_to: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    sort_by: str = Query("id"),
    order: str = Query("asc"),  # asc | desc
    db: Session = Depends(get_db),
):
    return crud.list_tasks(
        db,
        status=status,
        assigned_to=assigned_to,
        q=q,
        limit=limit,
        offset=offset,
        sort_by=sort_by,
        order=order,
    )


# ---------------- COMMENT ENDPOINTS -----------------


@app.get("/tasks/{task_id}/comments", response_model=List[schemas.CommentOut])
def list_comments(task_id: int, db: Session = Depends(get_db)):
    # ensure task exists
    task = crud.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    return crud.get_comments_for_task(db, task_id)


@app.post(
    "/tasks/{task_id}/comments",
    response_model=schemas.CommentOut,
    status_code=201,
)
def add_comment(task_id: int, payload: schemas.CommentCreate, db: Session = Depends(get_db)):
    # ensure task exists
    task = crud.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    return crud.create_comment_for_task(db, task_id, payload)

# ---------------- ATTACHMENT ENDPOINTS -----------------

# ---------------- ATTACHMENT ENDPOINTS -----------------


@app.get(
    "/tasks/{task_id}/attachments",
    response_model=List[schemas.AttachmentOut],
)
def list_attachments(task_id: int, db: Session = Depends(get_db)):
    # optional: ensure task exists
    task = crud.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    return crud.get_attachments_for_task(db, task_id)


@app.post(
    "/tasks/{task_id}/attachments",
    response_model=schemas.AttachmentOut,
    status_code=201,
)
async def upload_attachment(
    task_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    # ensure task exists
    task = crud.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # create unique stored filename
    stored_name = f"{uuid.uuid4().hex}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, stored_name)

    # save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # save DB record (we store relative path)
    att = crud.create_attachment(
        db=db,
        task_id=task_id,
        filename=file.filename,
        filepath=stored_name,
    )

    return att


@app.get("/attachments/{attachment_id}")
def download_attachment(attachment_id: int, db: Session = Depends(get_db)):
    att = crud.get_attachment(db, attachment_id)
    if not att:
        raise HTTPException(status_code=404, detail="Attachment not found")

    file_path = os.path.join(UPLOAD_DIR, att.filepath)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found on server")

    return FileResponse(
        path=file_path,
        media_type="application/octet-stream",
        filename=att.filename,
    )





# ---------------- AUTH ENDPOINTS -----------------


@app.post("/auth/signup", response_model=schemas.UserOut)
def signup(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = crud.get_user_by_username(db, user_in.username)
    if existing:
        raise HTTPException(status_code=400, detail="Username already registered")

    hashed_pw = get_password_hash(user_in.password)
    user = crud.create_user(db, user_in, hashed_pw)
    return user


@app.post("/auth/login", response_model=schemas.Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = crud.get_user_by_username(db, form_data.username)
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect username or password")

    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect username or password")

    access_token = create_access_token(data={"sub": user.username})
    return schemas.Token(access_token=access_token, token_type="bearer")




@app.get("/auth/me", response_model=schemas.UserOut)
async def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user
