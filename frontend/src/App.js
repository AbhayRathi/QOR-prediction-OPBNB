import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './web3/config';
import { WalletConnect } from './components/WalletConnect';
import { useRegisterRobot, useBuyYes, useBuyNo, useRedeemWinnings, useVoteOnProposal, useIsConnected } from './web3/hooks';
import { showTxPending, showTxSuccess, showTxError, showConnectWalletWarning } from './web3/txHelpers';
import { ConfirmDialog } from './components/ConfirmDialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Create query client for React Query
const queryClient = new QueryClient();

// ===== HOME PAGE =====
const Home = () => {
  return (
    <div className="home-page">
      <div className="hero-section">
        <div className="hero-content">
          <div className="hero-badge" data-testid="hero-badge">
            <span className="badge-dot"></span>
            Powered by opBNB
          </div>
          <h1 className="hero-title" data-testid="hero-title">
            Quantum-Optimized
            <br />
            <span className="title-accent">Robotics Network</span>
          </h1>
          <p className="hero-subtitle" data-testid="hero-subtitle">
            Decentralized coordination for robots, AI agents, and quantum optimizers.
            <br />
            Stake, predict, and govern the future of autonomous systems.
          </p>
          <div className="hero-actions">
            <Link to="/robots">
              <Button size="lg" className="primary-btn" data-testid="get-started-btn">
                Get Started
              </Button>
            </Link>
            <Link to="/tasks">
              <Button size="lg" variant="outline" className="secondary-btn" data-testid="explore-markets-btn">
                Explore Markets
              </Button>
            </Link>
          </div>
        </div>
        <div className="hero-stats">
          <div className="stat-card">
            <div className="stat-value" data-testid="stat-robots">127</div>
            <div className="stat-label">Active Robots</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" data-testid="stat-tasks">43</div>
            <div className="stat-label">Live Markets</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" data-testid="stat-volume">$2.4M</div>
            <div className="stat-label">Total Volume</div>
          </div>
        </div>
      </div>

      <div className="features-section">
        <h2 className="section-title" data-testid="features-title">How QOR Works</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🤖</div>
            <h3>Register Agents</h3>
            <p>Robots and AI agents stake tokens to join the network and build reputation.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Prediction Markets</h3>
            <p>Communities bet on mission success with binary YES/NO markets.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Quantum Optimization</h3>
            <p>Advanced algorithms generate optimal mission plans and routes.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">✅</div>
            <h3>Oracle Verification</h3>
            <p>Decentralized oracles verify outcomes and distribute rewards.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🗳️</div>
            <h3>DAO Governance</h3>
            <p>Token holders vote on ethics, funding, and network parameters.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💰</div>
            <h3>Gasless UX</h3>
            <p>ERC-4337 account abstraction for seamless interactions.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ===== ROBOTS PAGE =====
const RobotsPage = () => {
  const [robots, setRobots] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRobot, setEditingRobot] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    capabilities: "",
    stake_amount: "0.01"
  });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, robotId: null });
  
  // Web3 hooks
  const { isConnected } = useIsConnected();
  const { registerRobot, isPending, isConfirming, isSuccess, hash } = useRegisterRobot();

  useEffect(() => {
    loadRobots();
  }, []);
  
  // Auto-reload robots after successful blockchain registration
  useEffect(() => {
    if (isSuccess) {
      showTxSuccess(hash, "Robot registered on blockchain!");
      setTimeout(() => loadRobots(), 2000);
      setShowForm(false);
      setEditingRobot(null);
      setFormData({ name: "", description: "", capabilities: "", stake_amount: "0.01" });
    }
  }, [isSuccess, hash]);

  const loadRobots = async () => {
    try {
      const res = await axios.get(`${API}/robots`);
      setRobots(res.data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load robots");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    // Check wallet connection
    if (!isConnected) {
      showConnectWalletWarning();
      return;
    }
    
    try {
      const capabilities = formData.capabilities.split(",").map(c => c.trim());
      
      // Show pending message
      showTxPending("Registering robot on blockchain...");
      
      // Register on blockchain first
      const { robotIdHash, metadataURI } = await registerRobot({
        name: formData.name,
        stake_amount: parseFloat(formData.stake_amount)
      });
      
      // Also save to backend DB for indexing
      await axios.post(`${API}/robots/register`, {
        name: formData.name,
        description: formData.description,
        capabilities,
        stake_amount: parseFloat(formData.stake_amount)
      });
      
    } catch (e) {
      console.error(e);
      showTxError(e, "Failed to register robot");
    }
  };
  
  const handleEdit = (robot) => {
    setEditingRobot(robot);
    setFormData({
      name: robot.name,
      description: robot.description,
      capabilities: robot.capabilities.join(", "),
      stake_amount: "0"
    });
    setShowForm(true);
  };
  
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const capabilities = formData.capabilities.split(",").map(c => c.trim());
      const stakeIncrease = parseFloat(formData.stake_amount);
      
      await axios.put(`${API}/robots/${editingRobot.id}`, {
        description: formData.description,
        capabilities: capabilities,
        stake_increase: stakeIncrease > 0 ? stakeIncrease : null
      });
      
      toast.success("Robot updated successfully!");
      setShowForm(false);
      setEditingRobot(null);
      setFormData({ name: "", description: "", capabilities: "", stake_amount: "0.01" });
      loadRobots();
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.detail || "Failed to update robot");
    }
  };
  
  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/robots/${deleteDialog.robotId}`);
      toast.success("Robot deleted successfully!");
      setDeleteDialog({ open: false, robotId: null });
      loadRobots();
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.detail || "Failed to delete robot");
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title" data-testid="robots-page-title">Robot Registry</h1>
          <p className="page-subtitle">Register and manage autonomous agents on the network</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} data-testid="register-robot-btn">
          {showForm ? "Cancel" : "Register New Robot"}
        </Button>
      </div>

      {showForm && (
        <Card className="register-card" data-testid="register-robot-form">
          <CardHeader>
            <CardTitle>{editingRobot ? "Edit Robot" : "Register New Robot"}</CardTitle>
            <CardDescription>
              {editingRobot ? "Update robot details (description, capabilities, or increase stake)" : "Stake tokens to activate your agent"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={editingRobot ? handleUpdate : handleRegister} className="form-grid">
              <div className="form-field">
                <Label htmlFor="name">Robot Name</Label>
                <Input
                  id="name"
                  data-testid="robot-name-input"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  disabled={editingRobot !== null}
                />
                {editingRobot && <span className="text-sm text-gray-500">Name cannot be changed</span>}
              </div>
              <div className="form-field">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  data-testid="robot-description-input"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  required
                />
              </div>
              <div className="form-field">
                <Label htmlFor="capabilities">Capabilities (comma-separated)</Label>
                <Input
                  id="capabilities"
                  data-testid="robot-capabilities-input"
                  placeholder="navigation, sensing, manipulation"
                  value={formData.capabilities}
                  onChange={(e) => setFormData({...formData, capabilities: e.target.value})}
                  required
                />
              </div>
              <div className="form-field">
                <Label htmlFor="stake">{editingRobot ? "Increase Stake (optional)" : "Stake Amount (tokens)"}</Label>
                <Input
                  id="stake"
                  type="number"
                  data-testid="robot-stake-input"
                  value={formData.stake_amount}
                  onChange={(e) => setFormData({...formData, stake_amount: e.target.value})}
                  required={!editingRobot}
                />
                {editingRobot && <span className="text-sm text-gray-500">Leave 0 to keep current stake</span>}
              </div>
              <Button type="submit" className="submit-btn" data-testid="submit-robot-btn">
                {editingRobot ? "Update Robot" : "Register Robot"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        title="Delete Robot"
        description="Are you sure you want to delete this robot? This action cannot be undone. The robot must not have any active tasks."
        onConfirm={handleDelete}
        confirmText="Delete"
      />

      <div className="robots-grid">
        {robots.map((robot) => (
          <Card key={robot.id} className="robot-card" data-testid={`robot-card-${robot.id}`}>
            <CardHeader>
              <div className="robot-header">
                <CardTitle className="robot-name">{robot.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={robot.active ? "default" : "secondary"} data-testid={`robot-status-${robot.id}`}>
                    {robot.active ? "Active" : "Inactive"}
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleEdit(robot)}
                    data-testid={`edit-robot-${robot.id}`}
                    className="edit-btn-icon"
                  >
                    ✏️
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setDeleteDialog({ open: true, robotId: robot.id })}
                    data-testid={`delete-robot-${robot.id}`}
                    className="delete-btn-icon"
                  >
                    🗑️
                  </Button>
                </div>
              </div>
              <CardDescription>{robot.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="robot-details">
                <div className="detail-row">
                  <span className="detail-label">Reputation:</span>
                  <span className="detail-value" data-testid={`robot-reputation-${robot.id}`}>{robot.reputation}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Stake:</span>
                  <span className="detail-value" data-testid={`robot-stake-${robot.id}`}>{robot.stake} tokens</span>
                </div>
                <div className="capabilities">
                  {robot.capabilities.map((cap, idx) => (
                    <Badge key={idx} variant="outline">{cap}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// ===== TASKS PAGE =====
const TasksPage = () => {
  const [tasks, setTasks] = useState([]);
  const [robots, setRobots] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newDeadline, setNewDeadline] = useState("");
  const [deleteDialog, setDeleteDialog] = useState({ open: false, taskId: null });
  const navigate = useNavigate();

  useEffect(() => {
    loadTasks();
    loadRobots();
  }, []);

  const loadTasks = async () => {
    try {
      const res = await axios.get(`${API}/tasks`);
      setTasks(res.data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load tasks");
    }
  };

  const loadRobots = async () => {
    try {
      const res = await axios.get(`${API}/robots`);
      setRobots(res.data);
    } catch (e) {
      console.error(e);
    }
  };
  
  const handleEditClick = (task, e) => {
    e.stopPropagation();
    setEditingTask(task);
    setNewDeadline(task.deadline);
    setShowEditModal(true);
  };
  
  const handleUpdateDeadline = async () => {
    try {
      await axios.put(`${API}/tasks/${editingTask.id}`, {
        deadline: newDeadline
      });
      toast.success("Deadline updated successfully!");
      setShowEditModal(false);
      setEditingTask(null);
      loadTasks();
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.detail || "Failed to update task");
    }
  };
  
  const handleDeleteClick = (taskId, e) => {
    e.stopPropagation();
    setDeleteDialog({ open: true, taskId });
  };
  
  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/tasks/${deleteDialog.taskId}`);
      toast.success("Task deleted successfully!");
      setDeleteDialog({ open: false, taskId: null });
      loadTasks();
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.detail || "Failed to delete task");
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title" data-testid="tasks-page-title">Prediction Markets</h1>
          <p className="page-subtitle">Trade on mission outcomes and earn rewards</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} data-testid="create-task-btn">
          {showForm ? "Cancel" : "Create New Task"}
        </Button>
      </div>

      {showForm && (
        <CreateTaskForm robots={robots} onSuccess={() => { setShowForm(false); loadTasks(); }} />
      )}

      <div className="tasks-grid">
        {tasks.map((task) => (
          <Card key={task.id} className="task-card" data-testid={`task-card-${task.id}`} onClick={() => navigate(`/tasks/${task.id}`)}>
            <CardHeader>
              <div className="task-header">
                <CardTitle className="task-title">{task.title}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={task.status === "active" ? "default" : "secondary"} data-testid={`task-status-${task.id}`}>
                    {task.status}
                  </Badge>
                  {task.status !== "resolved" && (
                    <>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={(e) => handleEditClick(task, e)}
                        data-testid={`edit-task-${task.id}`}
                        className="edit-btn-icon"
                      >
                        ✏️
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={(e) => handleDeleteClick(task.id, e)}
                        data-testid={`delete-task-${task.id}`}
                        className="delete-btn-icon"
                      >
                        🗑️
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <CardDescription>{task.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="market-stats">
                <div className="stat">
                  <span className="stat-label">YES Pool</span>
                  <span className="stat-value yes" data-testid={`task-yes-pool-${task.id}`}>{task.yes_pool.toFixed(2)}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">NO Pool</span>
                  <span className="stat-value no" data-testid={`task-no-pool-${task.id}`}>{task.no_pool.toFixed(2)}</span>
                </div>
              </div>
              {task.status === "resolved" && (
                <div className="result-badge" data-testid={`task-result-${task.id}`}>
                  {task.success ? "✅ SUCCESS" : "❌ FAILED"}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        title="Delete Task"
        description="Are you sure you want to delete this task? This can only be done if there are no trades yet. This action cannot be undone."
        onConfirm={handleDelete}
        confirmText="Delete"
      />
      
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <Card className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>Edit Task Deadline</CardTitle>
              <CardDescription>Extend the deadline for this task</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="form-field">
                <Label htmlFor="newDeadline">New Deadline</Label>
                <Input
                  id="newDeadline"
                  type="datetime-local"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                />
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={handleUpdateDeadline}>Update Deadline</Button>
                <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

const CreateTaskForm = ({ robots, onSuccess }) => {
  const [formData, setFormData] = useState({
    robot_id: "",
    title: "",
    description: "",
    waypoints: "",
    deadline: "",
    required_score: "80"
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const waypoints = JSON.parse(formData.waypoints || "[]");
      await axios.post(`${API}/tasks/create`, {
        robot_id: formData.robot_id,
        title: formData.title,
        description: formData.description,
        waypoints,
        deadline: formData.deadline,
        required_score: parseFloat(formData.required_score)
      });
      toast.success("Task created successfully!");
      onSuccess();
    } catch (e) {
      console.error(e);
      toast.error("Failed to create task");
    }
  };

  return (
    <Card className="create-task-card" data-testid="create-task-form">
      <CardHeader>
        <CardTitle>Create New Task</CardTitle>
        <CardDescription>Set up a mission and prediction market</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-field">
            <Label htmlFor="robot">Select Robot</Label>
            <select
              id="robot"
              data-testid="task-robot-select"
              className="select-input"
              value={formData.robot_id}
              onChange={(e) => setFormData({...formData, robot_id: e.target.value})}
              required
            >
              <option value="">Choose a robot...</option>
              {robots.filter(r => r.active).map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              data-testid="task-title-input"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              required
            />
          </div>
          <div className="form-field">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              data-testid="task-description-input"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              required
            />
          </div>
          <div className="form-field">
            <Label htmlFor="waypoints">Waypoints (JSON array)</Label>
            <Textarea
              id="waypoints"
              data-testid="task-waypoints-input"
              placeholder='[{"lat": 37.7749, "lng": -122.4194, "action": "pickup"}]'
              value={formData.waypoints}
              onChange={(e) => setFormData({...formData, waypoints: e.target.value})}
            />
          </div>
          <div className="form-field">
            <Label htmlFor="deadline">Deadline</Label>
            <Input
              id="deadline"
              type="datetime-local"
              data-testid="task-deadline-input"
              value={formData.deadline}
              onChange={(e) => setFormData({...formData, deadline: e.target.value})}
              required
            />
          </div>
          <div className="form-field">
            <Label htmlFor="score">Required Score</Label>
            <Input
              id="score"
              type="number"
              data-testid="task-score-input"
              value={formData.required_score}
              onChange={(e) => setFormData({...formData, required_score: e.target.value})}
              required
            />
          </div>
          <Button type="submit" className="submit-btn" data-testid="submit-task-btn">
            Create Task
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

// ===== TASK DETAIL PAGE =====
const TaskDetailPage = () => {
  const { id } = useParams();
  const [task, setTask] = useState(null);
  const [robot, setRobot] = useState(null);
  const [positions, setPositions] = useState([]);
  const [tradeAmount, setTradeAmount] = useState("0.01");
  const [userName, setUserName] = useState("user_demo");
  const [optimizeResult, setOptimizeResult] = useState(null);
  
  // Web3 hooks
  const { isConnected } = useIsConnected();
  const buyYesHook = useBuyYes();
  const buyNoHook = useBuyNo();
  const redeemHook = useRedeemWinnings();

  useEffect(() => {
    loadTask();
  }, [id]);
  
  // Auto-reload after successful YES trade
  useEffect(() => {
    if (buyYesHook.isSuccess) {
      showTxSuccess(buyYesHook.hash, "YES shares purchased!");
      setTimeout(() => loadTask(), 2000);
    }
  }, [buyYesHook.isSuccess]);
  
  // Auto-reload after successful NO trade
  useEffect(() => {
    if (buyNoHook.isSuccess) {
      showTxSuccess(buyNoHook.hash, "NO shares purchased!");
      setTimeout(() => loadTask(), 2000);
    }
  }, [buyNoHook.isSuccess]);
  
  // Auto-reload after successful redeem
  useEffect(() => {
    if (redeemHook.isSuccess) {
      showTxSuccess(redeemHook.hash, "Winnings redeemed!");
      setTimeout(() => loadTask(), 2000);
    }
  }, [redeemHook.isSuccess]);

  const loadTask = async () => {
    try {
      const res = await axios.get(`${API}/tasks/${id}`);
      setTask(res.data);
      
      const robotRes = await axios.get(`${API}/robots/${res.data.robot_id}`);
      setRobot(robotRes.data);
      
      const posRes = await axios.get(`${API}/tasks/${id}/positions`);
      setPositions(posRes.data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load task");
    }
  };

  const handleTrade = async (side) => {
    // Check wallet connection for blockchain trades
    if (!isConnected) {
      showConnectWalletWarning();
      return;
    }
    
    try {
      const amount = parseFloat(tradeAmount);
      
      showTxPending(`Buying ${side.toUpperCase()} shares...`);
      
      // Execute blockchain transaction
      if (side === "yes") {
        await buyYesHook.buyYes(id, amount);
      } else {
        await buyNoHook.buyNo(id, amount);
      }
      
      // Also save to backend for indexing
      await axios.post(`${API}/tasks/${id}/trade`, {
        user: userName,
        amount: amount,
        side
      });
      
    } catch (e) {
      console.error(e);
      showTxError(e, "Trade failed");
    }
  };

  const handleOptimize = async () => {
    try {
      const res = await axios.post(`${API}/optimizer/optimize`, { task_id: id });
      setOptimizeResult(res.data);
      toast.success("Optimization complete!");
      loadTask();
    } catch (e) {
      console.error(e);
      toast.error("Optimization failed");
    }
  };

  const handleVerify = async () => {
    try {
      const evidenceUri = `ipfs://Qm${Math.random().toString(36).substring(7)}`;
      const res = await axios.post(`${API}/oracle/verify`, {
        task_id: id,
        evidence_uri: evidenceUri
      });
      toast.success(res.data.message);
      loadTask();
    } catch (e) {
      console.error(e);
      toast.error("Verification failed");
    }
  };

  const handleRedeem = async () => {
    // Check wallet connection
    if (!isConnected) {
      showConnectWalletWarning();
      return;
    }
    
    try {
      showTxPending("Redeeming winnings...");
      
      // Redeem on blockchain
      await redeemHook.redeem(id);
      
      // Also update backend
      const res = await axios.post(`${API}/tasks/${id}/redeem?user=${userName}`);
      
    } catch (e) {
      console.error(e);
      showTxError(e, "Redemption failed");
    }
  };

  if (!task) return <div className="loading">Loading...</div>;

  const totalPool = task.yes_pool + task.no_pool;
  const yesPercent = totalPool > 0 ? (task.yes_pool / totalPool) * 100 : 50;

  return (
    <div className="page-container">
      <div className="task-detail">
        <div className="task-detail-header">
          <div>
            <h1 className="page-title" data-testid="task-detail-title">{task.title}</h1>
            <p className="page-subtitle">{task.description}</p>
          </div>
          <Badge variant={task.status === "active" ? "default" : "secondary"} data-testid="task-detail-status">
            {task.status}
          </Badge>
        </div>

        <div className="detail-grid">
          <Card className="detail-card">
            <CardHeader>
              <CardTitle>Market Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="market-overview">
                <div className="pool-display">
                  <div className="pool-item yes">
                    <span className="pool-label">YES Pool</span>
                    <span className="pool-amount" data-testid="detail-yes-pool">{task.yes_pool.toFixed(2)}</span>
                  </div>
                  <div className="pool-item no">
                    <span className="pool-label">NO Pool</span>
                    <span className="pool-amount" data-testid="detail-no-pool">{task.no_pool.toFixed(2)}</span>
                  </div>
                </div>
                <Progress value={yesPercent} className="market-progress" data-testid="market-progress" />
                <div className="probability">
                  <span>YES: {yesPercent.toFixed(1)}%</span>
                  <span>NO: {(100 - yesPercent).toFixed(1)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {robot && (
            <Card className="detail-card">
              <CardHeader>
                <CardTitle>Assigned Robot</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="robot-info">
                  <h3 data-testid="assigned-robot-name">{robot.name}</h3>
                  <p>{robot.description}</p>
                  <div className="robot-stats">
                    <span>Reputation: <strong data-testid="assigned-robot-reputation">{robot.reputation}</strong></span>
                    <span>Stake: <strong>{robot.stake}</strong> tokens</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Tabs defaultValue="trade" className="task-tabs">
          <TabsList data-testid="task-tabs">
            <TabsTrigger value="trade" data-testid="trade-tab">Trade</TabsTrigger>
            <TabsTrigger value="optimize" data-testid="optimize-tab">Optimize</TabsTrigger>
            <TabsTrigger value="verify" data-testid="verify-tab">Verify</TabsTrigger>
            <TabsTrigger value="positions" data-testid="positions-tab">Positions</TabsTrigger>
          </TabsList>

          <TabsContent value="trade">
            <Card>
              <CardHeader>
                <CardTitle>Trade Shares</CardTitle>
                <CardDescription>Buy YES or NO shares in this market</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="trade-form">
                  <div className="form-field">
                    <Label htmlFor="userName">Your Username</Label>
                    <Input
                      id="userName"
                      data-testid="user-name-input"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <Label htmlFor="amount">Amount (tokens)</Label>
                    <Input
                      id="amount"
                      type="number"
                      data-testid="trade-amount-input"
                      value={tradeAmount}
                      onChange={(e) => setTradeAmount(e.target.value)}
                    />
                  </div>
                  <div className="trade-buttons">
                    <Button
                      onClick={() => handleTrade("yes")}
                      disabled={task.status !== "active" || buyYesHook.isPending || buyYesHook.isConfirming}
                      className="yes-btn"
                      data-testid="buy-yes-btn"
                    >
                      {buyYesHook.isPending || buyYesHook.isConfirming ? 'Buying...' : 'Buy YES'}
                    </Button>
                    <Button
                      onClick={() => handleTrade("no")}
                      disabled={task.status !== "active" || buyNoHook.isPending || buyNoHook.isConfirming}
                      className="no-btn"
                      data-testid="buy-no-btn"
                    >
                      {buyNoHook.isPending || buyNoHook.isConfirming ? 'Buying...' : 'Buy NO'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="optimize">
            <Card>
              <CardHeader>
                <CardTitle>Quantum Optimization</CardTitle>
                <CardDescription>Generate optimal mission plan</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleOptimize} disabled={!!task.solution_uri} data-testid="optimize-btn">
                  {task.solution_uri ? "Already Optimized" : "Run Optimizer"}
                </Button>
                {task.solution_uri && (
                  <div className="optimization-result" data-testid="optimization-result">
                    <Separator className="my-4" />
                    <h4>Optimization Complete</h4>
                    <p><strong>Score:</strong> <span data-testid="optimization-score">{task.optimization_score?.toFixed(2)}</span></p>
                    <p><strong>Solution URI:</strong> {task.solution_uri}</p>
                    {optimizeResult && (
                      <div className="plan-steps">
                        <h5>Plan:</h5>
                        {optimizeResult.plan.map((step, idx) => (
                          <div key={idx} className="plan-step">
                            Step {step.step}: {step.action} (Est. {step.estimated_time}min)
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="verify">
            <Card>
              <CardHeader>
                <CardTitle>Oracle Verification</CardTitle>
                <CardDescription>Verify mission completion and finalize market</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="verify-section">
                  <Button
                    onClick={handleVerify}
                    disabled={task.status === "resolved" || !task.solution_uri}
                    data-testid="verify-btn"
                  >
                    Verify Task
                  </Button>
                  {task.status === "resolved" && (
                    <div className="verification-result" data-testid="verification-result">
                      <Separator className="my-4" />
                      <h4>Verification Complete</h4>
                      <p className={task.success ? "success" : "failed"}>
                        Result: {task.success ? "✅ SUCCESS" : "❌ FAILED"}
                      </p>
                      <p><strong>Evidence URI:</strong> {task.evidence_uri}</p>
                      <Button onClick={handleRedeem} className="redeem-btn" data-testid="redeem-btn">
                        Redeem Winnings
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="positions">
            <Card>
              <CardHeader>
                <CardTitle>Market Positions</CardTitle>
                <CardDescription>{positions.length} total positions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="positions-list">
                  {positions.map((pos) => (
                    <div key={pos.id} className="position-item" data-testid={`position-${pos.id}`}>
                      <div className="position-user">{pos.user}</div>
                      <div className="position-details">
                        <Badge variant={pos.side === "yes" ? "default" : "secondary"}>{pos.side.toUpperCase()}</Badge>
                        <span>{pos.shares} shares</span>
                        <span>Cost: {pos.cost}</span>
                        {pos.redeemed && <Badge variant="outline">Redeemed</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// ===== DAO PAGE =====
const DAOPage = () => {
  const [proposals, setProposals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    action: ""
  });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, proposalId: null });
  const [withdrawDialog, setWithdrawDialog] = useState({ open: false, proposalId: null });
  
  // Web3 hooks
  const { isConnected } = useIsConnected();
  const voteHook = useVoteOnProposal();

  useEffect(() => {
    loadProposals();
  }, []);
  
  // Auto-reload after successful vote
  useEffect(() => {
    if (voteHook.isSuccess) {
      showTxSuccess(voteHook.hash, "Vote recorded on blockchain!");
      setTimeout(() => loadProposals(), 2000);
    }
  }, [voteHook.isSuccess]);

  const loadProposals = async () => {
    try {
      const res = await axios.get(`${API}/dao/proposals`);
      setProposals(res.data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load proposals");
    }
  };

  const handleCreateProposal = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/dao/propose`, formData);
      toast.success("Proposal created!");
      setShowForm(false);
      setFormData({ title: "", description: "", action: "" });
      loadProposals();
    } catch (e) {
      console.error(e);
      toast.error("Failed to create proposal");
    }
  };

  const handleVote = async (proposalId, support) => {
    // Check wallet connection
    if (!isConnected) {
      showConnectWalletWarning();
      return;
    }
    
    try {
      showTxPending(`Voting ${support ? "YES" : "NO"}...`);
      
      // Vote on blockchain
      await voteHook.vote(proposalId, support);
      
      // Also save to backend
      await axios.post(`${API}/dao/vote`, {
        proposal_id: proposalId,
        support,
        weight: 1.0
      });
      
    } catch (e) {
      console.error(e);
      showTxError(e, "Vote failed");
    }
  };

  const handleExecute = async (proposalId) => {
    try {
      const res = await axios.post(`${API}/dao/execute/${proposalId}`);
      toast.success(res.data.message);
      loadProposals();
    } catch (e) {
      console.error(e);
      toast.error("Execution failed");
    }
  };
  
  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/dao/proposals/${deleteDialog.proposalId}`);
      toast.success("Proposal deleted successfully!");
      setDeleteDialog({ open: false, proposalId: null });
      loadProposals();
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.detail || "Failed to delete proposal");
    }
  };
  
  const handleWithdraw = async () => {
    try {
      await axios.post(`${API}/dao/proposals/${withdrawDialog.proposalId}/withdraw`);
      toast.success("Proposal withdrawn!");
      setWithdrawDialog({ open: false, proposalId: null });
      loadProposals();
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.detail || "Failed to withdraw proposal");
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title" data-testid="dao-page-title">DAO Governance</h1>
          <p className="page-subtitle">Propose and vote on network changes</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} data-testid="create-proposal-btn">
          {showForm ? "Cancel" : "Create Proposal"}
        </Button>
      </div>

      {showForm && (
        <Card className="proposal-form-card" data-testid="create-proposal-form">
          <CardHeader>
            <CardTitle>Create Proposal</CardTitle>
            <CardDescription>Submit a governance proposal</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateProposal} className="form-grid">
              <div className="form-field">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  data-testid="proposal-title-input"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                />
              </div>
              <div className="form-field">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  data-testid="proposal-description-input"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  required
                />
              </div>
              <div className="form-field">
                <Label htmlFor="action">Action</Label>
                <Input
                  id="action"
                  data-testid="proposal-action-input"
                  placeholder="updateParameter, addCategory, etc."
                  value={formData.action}
                  onChange={(e) => setFormData({...formData, action: e.target.value})}
                  required
                />
              </div>
              <Button type="submit" className="submit-btn" data-testid="submit-proposal-btn">
                Create Proposal
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="proposals-grid">
        {proposals.map((proposal) => (
          <Card key={proposal.id} className="proposal-card" data-testid={`proposal-card-${proposal.id}`}>
            <CardHeader>
              <div className="proposal-header">
                <CardTitle className="proposal-title">{proposal.title}</CardTitle>
                <Badge variant={proposal.status === "active" ? "default" : "secondary"} data-testid={`proposal-status-${proposal.id}`}>
                  {proposal.status}
                </Badge>
              </div>
              <CardDescription>{proposal.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="proposal-details">
                <div className="vote-counts">
                  <div className="vote-item yes">
                    <span className="vote-label">YES</span>
                    <span className="vote-count" data-testid={`proposal-yes-votes-${proposal.id}`}>{proposal.yes_votes}</span>
                  </div>
                  <div className="vote-item no">
                    <span className="vote-label">NO</span>
                    <span className="vote-count" data-testid={`proposal-no-votes-${proposal.id}`}>{proposal.no_votes}</span>
                  </div>
                </div>
                {proposal.status === "active" && (
                  <div className="vote-buttons">
                    <Button
                      onClick={() => handleVote(proposal.id, true)}
                      className="yes-vote-btn"
                      data-testid={`vote-yes-${proposal.id}`}
                    >
                      Vote YES
                    </Button>
                    <Button
                      onClick={() => handleVote(proposal.id, false)}
                      variant="outline"
                      className="no-vote-btn"
                      data-testid={`vote-no-${proposal.id}`}
                    >
                      Vote NO
                    </Button>
                  </div>
                )}
                {proposal.status === "active" && proposal.yes_votes + proposal.no_votes >= 5 && (
                  <Button onClick={() => handleExecute(proposal.id)} className="execute-btn" data-testid={`execute-${proposal.id}`}>
                    Execute Proposal
                  </Button>
                )}
                <div className="proposal-action">
                  <span className="action-label">Action:</span>
                  <code>{proposal.action}</code>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// ===== NAV COMPONENT =====
const Navigation = () => {
  return (
    <nav className="nav" data-testid="navigation">
      <Link to="/" className="nav-brand" data-testid="nav-home">
        <span className="brand-icon">⚡</span>
        QOR Network
      </Link>
      <div className="nav-links">
        <Link to="/robots" className="nav-link" data-testid="nav-robots">Robots</Link>
        <Link to="/tasks" className="nav-link" data-testid="nav-tasks">Markets</Link>
        <Link to="/dao" className="nav-link" data-testid="nav-dao">DAO</Link>
        <WalletConnect />
      </div>
    </nav>
  );
};

// ===== MAIN APP =====
function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <div className="App">
          <BrowserRouter>
            <Navigation />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/robots" element={<RobotsPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/tasks/:id" element={<TaskDetailPage />} />
              <Route path="/dao" element={<DAOPage />} />
            </Routes>
          </BrowserRouter>
        </div>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;