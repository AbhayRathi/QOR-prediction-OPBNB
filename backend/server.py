from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import hashlib
import random

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Web3 service
try:
    from web3_service import web3_service
    print(f"✅ Web3 service loaded. Connected: {web3_service.is_connected()}")
    print(f"   Oracle Address: {web3_service.oracle_account.address}")
    print(f"   Contract Addresses: {web3_service.contract_addresses}")
except Exception as e:
    print(f"⚠️  Web3 service not available: {e}")
    web3_service = None

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ============ MODELS ============

# Robot Models
class RobotRegister(BaseModel):
    name: str
    description: str
    capabilities: List[str]
    stake_amount: float

class Robot(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    id_hash: str
    owner: str
    name: str
    description: str
    capabilities: List[str]
    metadata_uri: str
    reputation: int = 100
    stake: float
    active: bool = True
    created_at: str

# Task/Market Models
class TaskCreate(BaseModel):
    robot_id: str
    title: str
    description: str
    waypoints: List[Dict[str, Any]]
    deadline: str
    required_score: float = 80.0

class Trade(BaseModel):
    user: str
    amount: float
    side: str  # 'yes' or 'no'

class Task(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    robot_id: str
    title: str
    description: str
    waypoints: List[Dict[str, Any]]
    deadline: str
    required_score: float
    yes_pool: float = 0.0
    no_pool: float = 0.0
    yes_shares: float = 0.0
    no_shares: float = 0.0
    status: str = "active"  # active, resolved
    success: Optional[bool] = None
    resolver: str
    solution_uri: Optional[str] = None
    evidence_uri: Optional[str] = None
    optimization_score: Optional[float] = None
    created_at: str

class Position(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    task_id: str
    user: str
    side: str
    shares: float
    cost: float
    redeemed: bool = False
    created_at: str

# Optimizer Models
class OptimizeRequest(BaseModel):
    task_id: str

class OptimizeResult(BaseModel):
    task_id: str
    solution_uri: str
    score: float
    plan: List[Dict[str, Any]]

# Oracle Models
class VerifyRequest(BaseModel):
    task_id: str
    evidence_uri: str

class VerifyResult(BaseModel):
    task_id: str
    success: bool
    score: float
    message: str

# DAO Models
class ProposalCreate(BaseModel):
    title: str
    description: str
    action: str

class Proposal(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    description: str
    action: str
    proposer: str
    yes_votes: float = 0.0
    no_votes: float = 0.0
    status: str = "active"  # active, executed, rejected
    created_at: str

class Vote(BaseModel):
    proposal_id: str
    support: bool
    weight: float = 1.0

# IPFS Mock
class IPFSUpload(BaseModel):
    content: str

class IPFSResult(BaseModel):
    cid: str
    uri: str

# ============ ROUTES ============

@api_router.get("/")
async def root():
    return {"message": "QOR Network API", "version": "1.0.0"}

# ===== ROBOTS =====
@api_router.post("/robots/register", response_model=Robot)
async def register_robot(input: RobotRegister):
    robot_id = str(uuid.uuid4())
    id_hash = hashlib.sha256(robot_id.encode()).hexdigest()
    
    # Mock metadata upload to IPFS
    metadata = {
        "name": input.name,
        "description": input.description,
        "capabilities": input.capabilities
    }
    metadata_uri = f"ipfs://Qm{hashlib.sha256(str(metadata).encode()).hexdigest()[:44]}"
    
    robot = Robot(
        id=robot_id,
        id_hash=id_hash,
        owner="user_" + str(uuid.uuid4())[:8],
        name=input.name,
        description=input.description,
        capabilities=input.capabilities,
        metadata_uri=metadata_uri,
        reputation=100,
        stake=input.stake_amount,
        active=True,
        created_at=datetime.now(timezone.utc).isoformat()
    )
    
    await db.robots.insert_one(robot.model_dump())
    return robot

@api_router.get("/robots", response_model=List[Robot])
async def list_robots():
    robots = await db.robots.find({}, {"_id": 0}).to_list(1000)
    return robots

@api_router.get("/robots/{robot_id}", response_model=Robot)
async def get_robot(robot_id: str):
    robot = await db.robots.find_one({"id": robot_id}, {"_id": 0})
    if not robot:
        raise HTTPException(status_code=404, detail="Robot not found")
    return robot

@api_router.post("/robots/{robot_id}/deactivate")
async def deactivate_robot(robot_id: str):
    result = await db.robots.update_one(
        {"id": robot_id},
        {"$set": {"active": False}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Robot not found")
    return {"message": "Robot deactivated", "robot_id": robot_id}

class RobotUpdate(BaseModel):
    description: Optional[str] = None
    capabilities: Optional[List[str]] = None
    stake_increase: Optional[float] = None

@api_router.put("/robots/{robot_id}")
async def update_robot(robot_id: str, update: RobotUpdate):
    robot = await db.robots.find_one({"id": robot_id}, {"_id": 0})
    if not robot:
        raise HTTPException(status_code=404, detail="Robot not found")
    
    update_data = {}
    if update.description is not None:
        update_data["description"] = update.description
    if update.capabilities is not None:
        update_data["capabilities"] = update.capabilities
    if update.stake_increase is not None and update.stake_increase > 0:
        update_data["stake"] = robot["stake"] + update.stake_increase
    
    if update_data:
        await db.robots.update_one({"id": robot_id}, {"$set": update_data})
    
    return {"message": "Robot updated", "robot_id": robot_id}

@api_router.delete("/robots/{robot_id}")
async def delete_robot(robot_id: str):
    # Check if robot has active tasks
    active_tasks = await db.tasks.find_one({"robot_id": robot_id, "status": "active"})
    if active_tasks:
        raise HTTPException(status_code=400, detail="Cannot delete robot with active tasks")
    
    # Hard delete from database
    result = await db.robots.delete_one({"id": robot_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Robot not found")
    
    return {"message": "Robot deleted", "robot_id": robot_id}

# ===== TASKS/MARKETS =====
@api_router.post("/tasks/create", response_model=Task)
async def create_task(input: TaskCreate):
    # Verify robot exists
    robot = await db.robots.find_one({"id": input.robot_id}, {"_id": 0})
    if not robot:
        raise HTTPException(status_code=404, detail="Robot not found")
    
    task_id = str(uuid.uuid4())
    task = Task(
        id=task_id,
        robot_id=input.robot_id,
        title=input.title,
        description=input.description,
        waypoints=input.waypoints,
        deadline=input.deadline,
        required_score=input.required_score,
        resolver="oracle_" + str(uuid.uuid4())[:8],
        created_at=datetime.now(timezone.utc).isoformat()
    )
    
    await db.tasks.insert_one(task.model_dump())
    return task

@api_router.get("/tasks", response_model=List[Task])
async def list_tasks():
    tasks = await db.tasks.find({}, {"_id": 0}).to_list(1000)
    return tasks

@api_router.get("/tasks/{task_id}", response_model=Task)
async def get_task(task_id: str):
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@api_router.post("/tasks/{task_id}/trade")
async def trade_market(task_id: str, trade: Trade):
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task["status"] != "active":
        raise HTTPException(status_code=400, detail="Market is closed")
    
    # Simple 1:1 share pricing for MVP
    shares = trade.amount
    
    # Update pools
    if trade.side == "yes":
        await db.tasks.update_one(
            {"id": task_id},
            {"$inc": {"yes_pool": trade.amount, "yes_shares": shares}}
        )
    else:
        await db.tasks.update_one(
            {"id": task_id},
            {"$inc": {"no_pool": trade.amount, "no_shares": shares}}
        )
    
    # Record position
    position = Position(
        id=str(uuid.uuid4()),
        task_id=task_id,
        user=trade.user,
        side=trade.side,
        shares=shares,
        cost=trade.amount,
        created_at=datetime.now(timezone.utc).isoformat()
    )
    await db.positions.insert_one(position.model_dump())
    
    return {"message": "Trade executed", "shares": shares, "side": trade.side}

@api_router.get("/tasks/{task_id}/positions", response_model=List[Position])
async def get_task_positions(task_id: str):
    positions = await db.positions.find({"task_id": task_id}, {"_id": 0}).to_list(1000)
    return positions

@api_router.post("/tasks/{task_id}/redeem")
async def redeem_position(task_id: str, user: str):
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task["status"] != "resolved":
        raise HTTPException(status_code=400, detail="Task not resolved yet")
    
    # Find user positions
    positions = await db.positions.find(
        {"task_id": task_id, "user": user, "redeemed": False},
        {"_id": 0}
    ).to_list(1000)
    
    if not positions:
        raise HTTPException(status_code=404, detail="No positions to redeem")
    
    total_payout = 0.0
    winning_side = "yes" if task["success"] else "no"
    total_pool = task["yes_pool"] + task["no_pool"]
    
    for pos in positions:
        if pos["side"] == winning_side:
            if winning_side == "yes" and task["yes_shares"] > 0:
                payout = (pos["shares"] / task["yes_shares"]) * total_pool
            elif winning_side == "no" and task["no_shares"] > 0:
                payout = (pos["shares"] / task["no_shares"]) * total_pool
            else:
                payout = 0.0
            
            total_payout += payout
            await db.positions.update_one(
                {"id": pos["id"]},
                {"$set": {"redeemed": True}}
            )
    
    return {"message": "Positions redeemed", "payout": total_payout, "user": user}

# ===== OPTIMIZER =====
@api_router.post("/optimizer/optimize", response_model=OptimizeResult)
async def optimize_task(input: OptimizeRequest):
    task = await db.tasks.find_one({"id": input.task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Mock classical optimization (simple greedy TSP)
    waypoints = task["waypoints"]
    plan = []
    
    if waypoints:
        # Create a simple route visiting all waypoints
        for i, wp in enumerate(waypoints):
            plan.append({
                "step": i + 1,
                "waypoint": wp,
                "estimated_time": random.randint(5, 20),
                "action": wp.get("action", "visit")
            })
    
    # Mock optimization score
    score = random.uniform(85.0, 98.0)
    
    # Mock IPFS upload
    solution_uri = f"ipfs://Qm{hashlib.sha256(str(plan).encode()).hexdigest()[:44]}"
    
    # Update task with solution
    await db.tasks.update_one(
        {"id": input.task_id},
        {"$set": {
            "solution_uri": solution_uri,
            "optimization_score": score
        }}
    )
    
    # Submit to blockchain (if connected)
    if web3_service and web3_service.is_connected():
        try:
            task_id_bytes = bytes.fromhex(input.task_id.replace('-', ''))
            web3_service.submit_optimization_result(
                task_id_bytes,
                solution_uri,
                int(score * 100)  # Convert to integer (score out of 10000)
            )
        except Exception as e:
            print(f"⚠️  Could not submit to blockchain: {e}")
    
    result = OptimizeResult(
        task_id=input.task_id,
        solution_uri=solution_uri,
        score=score,
        plan=plan
    )
    
    return result

# ===== ORACLE =====
@api_router.post("/oracle/verify", response_model=VerifyResult)
async def verify_task(input: VerifyRequest):
    task = await db.tasks.find_one({"id": input.task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task["status"] == "resolved":
        raise HTTPException(status_code=400, detail="Task already resolved")
    
    # Mock verification - check if optimization score meets requirement
    score = task.get("optimization_score", 0)
    required_score = task["required_score"]
    success = score >= required_score
    
    # Update task status
    await db.tasks.update_one(
        {"id": input.task_id},
        {"$set": {
            "status": "resolved",
            "success": success,
            "evidence_uri": input.evidence_uri
        }}
    )
    
    # Update robot reputation
    reputation_delta = 10 if success else -5
    await db.robots.update_one(
        {"id": task["robot_id"]},
        {"$inc": {"reputation": reputation_delta}}
    )
    
    # Submit verification to blockchain (if connected)
    if web3_service and web3_service.is_connected():
        try:
            task_id_bytes = bytes.fromhex(input.task_id.replace('-', ''))
            robot_id_bytes = bytes.fromhex(task["robot_id"].replace('-', ''))
            web3_service.verify_task(
                task_id_bytes,
                robot_id_bytes,
                int(required_score * 100),  # Convert to integer
                input.evidence_uri
            )
        except Exception as e:
            print(f"⚠️  Could not verify on blockchain: {e}")
    
    result = VerifyResult(
        task_id=input.task_id,
        success=success,
        score=score,
        message=f"Task {'succeeded' if success else 'failed'}. Score: {score:.2f}/{required_score}"
    )
    
    return result

# ===== DAO =====
@api_router.post("/dao/propose", response_model=Proposal)
async def create_proposal(input: ProposalCreate):
    proposal_id = str(uuid.uuid4())
    proposal = Proposal(
        id=proposal_id,
        title=input.title,
        description=input.description,
        action=input.action,
        proposer="user_" + str(uuid.uuid4())[:8],
        created_at=datetime.now(timezone.utc).isoformat()
    )
    
    await db.proposals.insert_one(proposal.model_dump())
    return proposal

@api_router.get("/dao/proposals", response_model=List[Proposal])
async def list_proposals():
    proposals = await db.proposals.find({}, {"_id": 0}).to_list(1000)
    return proposals

@api_router.post("/dao/vote")
async def vote_proposal(vote: Vote):
    proposal = await db.proposals.find_one({"id": vote.proposal_id}, {"_id": 0})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    if proposal["status"] != "active":
        raise HTTPException(status_code=400, detail="Proposal not active")
    
    # Update vote counts
    if vote.support:
        await db.proposals.update_one(
            {"id": vote.proposal_id},
            {"$inc": {"yes_votes": vote.weight}}
        )
    else:
        await db.proposals.update_one(
            {"id": vote.proposal_id},
            {"$inc": {"no_votes": vote.weight}}
        )
    
    return {"message": "Vote recorded", "proposal_id": vote.proposal_id}

@api_router.post("/dao/execute/{proposal_id}")
async def execute_proposal(proposal_id: str):
    proposal = await db.proposals.find_one({"id": proposal_id}, {"_id": 0})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    if proposal["status"] != "active":
        raise HTTPException(status_code=400, detail="Proposal not active")
    
    # Check if passed (simple majority)
    if proposal["yes_votes"] > proposal["no_votes"]:
        await db.proposals.update_one(
            {"id": proposal_id},
            {"$set": {"status": "executed"}}
        )
        return {"message": "Proposal executed", "action": proposal["action"]}
    else:
        await db.proposals.update_one(
            {"id": proposal_id},
            {"$set": {"status": "rejected"}}
        )
        return {"message": "Proposal rejected"}

# ===== IPFS MOCK =====
@api_router.post("/ipfs/upload", response_model=IPFSResult)
async def upload_to_ipfs(input: IPFSUpload):
    # Mock IPFS upload - generate CID from content hash
    cid = f"Qm{hashlib.sha256(input.content.encode()).hexdigest()[:44]}"
    uri = f"ipfs://{cid}"
    
    return IPFSResult(cid=cid, uri=uri)

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()