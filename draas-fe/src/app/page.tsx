'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/registry/new-york-v4/ui/button';
import { Card, CardContent } from '@/registry/new-york-v4/ui/card';
import { Input } from '@/registry/new-york-v4/ui/input';
import { ScrollArea } from '@/registry/new-york-v4/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/registry/new-york-v4/ui/tabs';

import { MonitorCheck, ServerCrash, Terminal, UploadCloud, XCircle } from 'lucide-react';

interface Agent {
    ip: string;
    cpu: number;
    memory: number;
    last_seen: number;
    state: string;
}

interface DeploymentInfo {
    status: string;
    mapped_ports: Record<string, any>;
    logs: string;
}

export default function SchedulerDashboard() {
    const API_BASE_URL = 'https://56c6-2409-4085-28c-d21a-183c-2457-d23-9029.ngrok-free.app';

    const [agents, setAgents] = useState<Record<string, Agent>>({});
    const [deployments, setDeployments] = useState<any>({});
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [selectedDeploymentId, setSelectedDeploymentId] = useState<string>('');
    const [deploymentInfo, setDeploymentInfo] = useState<DeploymentInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<string>('');

    useEffect(() => {
        fetchAgents();
        fetchDeployments();
        const interval = setInterval(() => {
            fetchAgents();
            fetchDeployments();
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const fetchAgents = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/agents`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            const data = await res.json();
            setAgents(data);
        } catch (err) {
            console.error('Failed to fetch agents:', err);
        }
    };

    const fetchDeployments = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/deployments`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            const data = await res.json();
            setDeployments(data);
        } catch (err) {
            console.error('Failed to fetch deployments:', err);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setUploadFile(e.target.files[0]);
        }
    };

    const uploadCode = async () => {
        if (!uploadFile) return alert('Select a zip file.');
        setUploadStatus('Uploading...');
        setIsLoading(true);
        const formData = new FormData();
        formData.append('code', uploadFile);
        try {
            const res = await fetch(`${API_BASE_URL}/upload_code`, {
                method: 'POST',
                headers: { 'ngrok-skip-browser-warning': 'true' },
                body: formData
            });
            const data = await res.json();
            if (res.ok) {
                setUploadStatus(`Deployed with ID: ${data.deployment_id}`);
                fetchDeployments();
            } else {
                setUploadStatus(data.message);
            }
        } catch (err) {
            console.error('Upload error:', err);
            setUploadStatus('Server error');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchLogs = async (deploymentId: string) => {
        setSelectedDeploymentId(deploymentId);
        try {
            const res = await fetch(`${API_BASE_URL}/deployment_logs?deployment_id=${deploymentId}`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            const data = await res.json();
            setDeploymentInfo(data);
        } catch (err) {
            console.error('Log fetch error:', err);
        }
    };

    const cancelDeployment = async () => {
        if (!selectedDeploymentId) return;
        const deployment = deployments[selectedDeploymentId];
        if (!deployment) return;

        try {
            const res = await fetch(`${API_BASE_URL}/cancel_deployment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({
                    deployment_id: selectedDeploymentId,
                    agent_ip: deployment.agent
                })
            });
            const data = await res.json();
            fetchDeployments();
            setDeploymentInfo(null);
            setSelectedDeploymentId('');
            alert(`Deployment cancelled: ${data.status}`);
        } catch (err) {
            console.error('Cancel error:', err);
        }
    };

    return (
        <div className='min-h-screen bg-rose-50 p-6 dark:bg-neutral-900'>
            <h1 className='mb-6 flex items-center gap-2 text-3xl font-bold text-rose-700 dark:text-rose-300'>
                <MonitorCheck className='size-7' /> Scheduler Dashboard
            </h1>
            <Tabs defaultValue='agents' className='space-y-6'>
                <TabsList>
                    <TabsTrigger value='agents'>Agents</TabsTrigger>
                    <TabsTrigger value='deployments'>Deployments</TabsTrigger>
                    <TabsTrigger value='upload'>Upload & Deploy</TabsTrigger>
                </TabsList>

                <TabsContent value='agents'>
                    <div className='grid gap-4 md:grid-cols-2'>
                        {Object.entries(agents).map(([id, agent]) => (
                            <Card key={id} className='bg-white dark:bg-neutral-800'>
                                <CardContent className='space-y-2 p-4'>
                                    <p className='text-lg font-semibold text-rose-700 dark:text-rose-300'>{id}</p>
                                    <p>IP: {agent.ip}</p>
                                    <p>CPU: {agent.cpu}%</p>
                                    <p>Memory: {agent.memory}MB</p>
                                    <p>
                                        Status:{' '}
                                        <span className={agent.state === 'Free' ? 'text-green-600' : 'text-red-600'}>
                                            {agent.state}
                                        </span>
                                    </p>
                                    <p>Last Seen: {new Date(agent.last_seen * 1000).toLocaleString()}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value='deployments'>
                    <div className='grid gap-4 md:grid-cols-2'>
                        <ScrollArea className='h-[500px] space-y-4'>
                            {Object.entries(deployments).map(([id, dep]: any) => (
                                <Card
                                    key={id}
                                    className={`cursor-pointer transition hover:shadow-lg ${selectedDeploymentId === id ? 'ring-2 ring-rose-400' : ''}`}
                                    onClick={() => fetchLogs(id)}>
                                    <CardContent className='space-y-1 p-4'>
                                        <p className='flex items-center gap-2 font-semibold text-rose-700 dark:text-rose-300'>
                                            <Terminal className='size-4' /> ID: {id}
                                        </p>
                                        <p>Agent: {dep.agent}</p>
                                        <p>
                                            Status:{' '}
                                            <span
                                                className={
                                                    dep.status === 'running'
                                                        ? 'text-green-600'
                                                        : dep.status === 'failed'
                                                          ? 'text-red-600'
                                                          : 'text-yellow-600'
                                                }>
                                                {dep.status}
                                            </span>
                                        </p>
                                        <p>Image: {dep.image}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </ScrollArea>

                        {deploymentInfo && (
                            <Card className='border border-rose-300 bg-gray-50 dark:bg-neutral-800'>
                                <CardContent className='space-y-4 p-4'>
                                    <div className='flex items-center justify-between'>
                                        <h3 className='text-lg font-semibold text-rose-700 dark:text-rose-300'>
                                            Deployment Info
                                        </h3>
                                        <Button
                                            variant='outline'
                                            onClick={cancelDeployment}
                                            className='flex items-center gap-2 border-rose-600 text-rose-600 dark:border-rose-400 dark:text-rose-300'>
                                            <XCircle className='size-4' /> Cancel
                                        </Button>
                                    </div>
                                    <div>
                                        <p className='font-medium'>Status:</p>
                                        <p className='text-sm'>
                                            <span
                                                className={
                                                    deploymentInfo.status === 'running'
                                                        ? 'text-green-600'
                                                        : deploymentInfo.status === 'failed'
                                                          ? 'text-red-600'
                                                          : 'text-yellow-600'
                                                }>
                                                {deploymentInfo.status}
                                            </span>
                                        </p>
                                    </div>
                                    <div>
                                        <p className='font-medium'>Mapped Ports:</p>
                                        <ul className='list-inside list-disc text-sm'>
                                            {Object.entries(deploymentInfo.mapped_ports || {}).map(
                                                ([port, bindings]) => (
                                                    <li key={port}>
                                                        {port} →{' '}
                                                        {Array.isArray(bindings)
                                                            ? bindings
                                                                  .map((b) => `${b.HostIp}:${b.HostPort}`)
                                                                  .join(', ')
                                                            : JSON.stringify(bindings)}
                                                    </li>
                                                )
                                            )}
                                        </ul>
                                    </div>
                                    <div>
                                        <p className='font-medium'>Logs:</p>
                                        <pre className='max-h-64 overflow-y-auto rounded bg-black p-3 text-xs text-green-200'>
                                            {deploymentInfo.logs || 'No logs available'}
                                        </pre>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value='upload'>
                    <div className='max-w-md space-y-4'>
                        <Input type='file' accept='.zip' onChange={handleFileChange} />
                        <Button
                            onClick={uploadCode}
                            disabled={isLoading || !uploadFile}
                            className='flex items-center gap-2 bg-rose-600 hover:bg-rose-700'>
                            <UploadCloud className='size-4' />
                            {isLoading ? 'Uploading...' : 'Upload and Deploy'}
                        </Button>
                        {uploadStatus && <p className='text-sm text-rose-600 dark:text-rose-300'>{uploadStatus}</p>}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
