#!/usr/bin/env python3

"""
Agentic Browser Server - WebSocket server for real-time communication
between the frontend and the agentic browser backend
"""

import asyncio
import json
import websockets
import logging
from typing import Dict, Any
from agentic_browser import AgenticBrowser

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AgenticBrowserServer:
    def __init__(self):
        self.active_sessions: Dict[str, AgenticBrowser] = {}
        self.client_connections: Dict[str, Any] = {}

    async def handle_client(self, websocket):
        """Handle WebSocket client connections"""
        client_id = f"client_{id(websocket)}"
        self.client_connections[client_id] = websocket
        
        logger.info(f"Client {client_id} connected")
        
        try:
            # Send welcome message
            await websocket.send(json.dumps({
                "type": "connection",
                "status": "connected",
                "client_id": client_id,
                "message": "Agentic Browser Server ready"
            }))
            
            async for message in websocket:
                try:
                    data = json.loads(message)
                    await self.handle_message(client_id, websocket, data)
                except json.JSONDecodeError:
                    await websocket.send(json.dumps({
                        "type": "error",
                        "message": "Invalid JSON format"
                    }))
                except Exception as e:
                    logger.error(f"Error handling message: {e}")
                    await websocket.send(json.dumps({
                        "type": "error",
                        "message": str(e)
                    }))
                    
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"Client {client_id} disconnected")
        finally:
            # Cleanup
            if client_id in self.client_connections:
                del self.client_connections[client_id]
            if client_id in self.active_sessions:
                await self.active_sessions[client_id].cleanup()
                del self.active_sessions[client_id]

    async def handle_message(self, client_id: str, websocket, data: Dict[str, Any]):
        """Handle incoming messages from clients"""
        message_type = data.get("type")
        
        if message_type == "start_execution":
            await self.start_execution(client_id, websocket, data)
        elif message_type == "stop_execution":
            await self.stop_execution(client_id, websocket)
        elif message_type == "get_status":
            await self.get_status(client_id, websocket)
        else:
            await websocket.send(json.dumps({
                "type": "error",
                "message": f"Unknown message type: {message_type}"
            }))

    async def start_execution(self, client_id: str, websocket, data: Dict[str, Any]):
        """Start agentic browser execution"""
        user_request = data.get("user_request", "")
        openai_api_key = data.get("openai_api_key")
        
        if not user_request:
            await websocket.send(json.dumps({
                "type": "error",
                "message": "No user request provided"
            }))
            return
        
        try:
            # Create new agentic browser instance
            browser = AgenticBrowser(openai_api_key=openai_api_key)
            await browser.initialize(headless=True)
            
            self.active_sessions[client_id] = browser
            
            # Start execution in background
            asyncio.create_task(self.execute_with_updates(client_id, websocket, browser, user_request))
            
            await websocket.send(json.dumps({
                "type": "execution_started",
                "message": "Agentic browser execution started"
            }))
            
        except Exception as e:
            logger.error(f"Failed to start execution: {e}")
            await websocket.send(json.dumps({
                "type": "error",
                "message": f"Failed to start execution: {str(e)}"
            }))

    async def execute_with_updates(self, client_id: str, websocket, browser: AgenticBrowser, user_request: str):
        """Execute browser automation with real-time updates"""
        try:
            # Parse goals
            await websocket.send(json.dumps({
                "type": "log",
                "message": "🎯 Parsing natural language request..."
            }))
            
            goals = browser.parse_natural_language_goal(user_request)
            
            await websocket.send(json.dumps({
                "type": "goals_identified",
                "goals": [
                    {
                        "id": goal.id,
                        "description": goal.description,
                        "status": goal.status.value,
                        "progress": 0
                    }
                    for goal in goals
                ]
            }))
            
            # Execute each goal
            total_goals = len(goals)
            completed_goals = 0
            
            for goal in goals:
                await websocket.send(json.dumps({
                    "type": "goal_started",
                    "goal_id": goal.id,
                    "description": goal.description
                }))
                
                # Plan actions
                await websocket.send(json.dumps({
                    "type": "log",
                    "message": f"📋 Planning actions for: {goal.description}"
                }))
                
                actions = await browser.plan_actions(goal)
                
                # Execute actions
                for i, action in enumerate(actions):
                    await websocket.send(json.dumps({
                        "type": "action_started",
                        "action": {
                            "type": action.type.value,
                            "target": action.target,
                            "reasoning": action.reasoning
                        }
                    }))
                    
                    result = await browser.execute_action(action)
                    
                    await websocket.send(json.dumps({
                        "type": "action_completed",
                        "action": action.type.value,
                        "success": result.success,
                        "data": result.data,
                        "error": result.error if not result.success else None
                    }))
                    
                    if not result.success:
                        await websocket.send(json.dumps({
                            "type": "error",
                            "message": f"Action failed: {result.error}"
                        }))
                        break
                
                # Check goal completion
                goal_completed = await browser.check_goal_completion(goal)
                completed_goals += 1 if goal_completed else 0
                
                await websocket.send(json.dumps({
                    "type": "goal_completed",
                    "goal_id": goal.id,
                    "success": goal_completed,
                    "overall_progress": (completed_goals / total_goals) * 100
                }))
            
            # Final results
            await websocket.send(json.dumps({
                "type": "execution_completed",
                "success": completed_goals == total_goals,
                "summary": {
                    "total_goals": total_goals,
                    "completed_goals": completed_goals,
                    "failed_goals": total_goals - completed_goals
                }
            }))
            
        except Exception as e:
            logger.error(f"Execution failed: {e}")
            await websocket.send(json.dumps({
                "type": "execution_failed",
                "error": str(e)
            }))
        finally:
            # Cleanup
            if client_id in self.active_sessions:
                await browser.cleanup()
                del self.active_sessions[client_id]

    async def stop_execution(self, client_id: str, websocket):
        """Stop ongoing execution"""
        if client_id in self.active_sessions:
            await self.active_sessions[client_id].cleanup()
            del self.active_sessions[client_id]
            
            await websocket.send(json.dumps({
                "type": "execution_stopped",
                "message": "Execution stopped by user"
            }))
        else:
            await websocket.send(json.dumps({
                "type": "error",
                "message": "No active execution to stop"
            }))

    async def get_status(self, client_id: str, websocket):
        """Get current execution status"""
        is_running = client_id in self.active_sessions
        
        await websocket.send(json.dumps({
            "type": "status_response",
            "is_running": is_running,
            "active_sessions": len(self.active_sessions)
        }))

    async def start_server(self, host="localhost", port=8765):
        """Start the WebSocket server"""
        logger.info(f"Starting Agentic Browser Server on {host}:{port}")
        
        async with websockets.serve(self.handle_client, host, port):
            logger.info("Server started. Waiting for connections...")
            await asyncio.Future()  # Run forever

if __name__ == "__main__":
    server = AgenticBrowserServer()
    asyncio.run(server.start_server())
