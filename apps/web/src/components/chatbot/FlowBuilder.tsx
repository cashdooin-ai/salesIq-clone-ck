import { useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { StartNode } from './nodes/StartNode';
import { MessageNode } from './nodes/MessageNode';
import { QuestionNode } from './nodes/QuestionNode';
import { ButtonsNode } from './nodes/ButtonsNode';
import { ConditionNode } from './nodes/ConditionNode';
import { ActionNode } from './nodes/ActionNode';
import { EndNode } from './nodes/EndNode';
import { useChatbotStore } from '@/stores/chatbotStore';

const nodeTypes: NodeTypes = {
  start: StartNode,
  message: MessageNode,
  question: QuestionNode,
  buttons: ButtonsNode,
  condition: ConditionNode,
  action: ActionNode,
  end: EndNode,
};

export function FlowBuilder() {
  const { nodes, edges, setNodes, setEdges, setSelectedNode } = useChatbotStore();

  const [nodesState, setNodesState, onNodesChange] = useNodesState(nodes);
  const [edgesState, setEdgesState, onEdgesChange] = useEdgesState(edges);

  // Sync with store whenever nodes/edges change
  const handleNodesChange = useCallback(
    (changes: any) => {
      onNodesChange(changes);
      setNodes(nodesState);
    },
    [onNodesChange, setNodes, nodesState]
  );

  const handleEdgesChange = useCallback(
    (changes: any) => {
      onEdgesChange(changes);
      setEdges(edgesState);
    },
    [onEdgesChange, setEdges, edgesState]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdge = {
        id: `edge-${Date.now()}`,
        source: connection.source!,
        target: connection.target!,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
      };

      setEdgesState((eds) => addEdge(connection, eds));
      setEdges([...edgesState, newEdge]);
    },
    [setEdgesState, setEdges, edgesState]
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNode(node as any);
    },
    [setSelectedNode]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodesState}
        edges={edgesState}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        className="bg-gray-50"
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const colors: Record<string, string> = {
              start: '#22c55e',
              message: '#3b82f6',
              question: '#a855f7',
              buttons: '#6366f1',
              condition: '#eab308',
              action: '#f97316',
              end: '#ef4444',
            };
            return colors[node.type || 'default'] || '#gray';
          }}
        />
      </ReactFlow>
    </div>
  );
}
