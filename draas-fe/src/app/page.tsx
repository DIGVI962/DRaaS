'use client';

import { useEffect, useState } from 'react';

import contractABI from '@/lib/FileUploadFeeABI.json';
import { Badge } from '@/registry/new-york-v4/ui/badge';
import { Button } from '@/registry/new-york-v4/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/registry/new-york-v4/ui/card';
import { Input } from '@/registry/new-york-v4/ui/input';
import { Progress } from '@/registry/new-york-v4/ui/progress';
import { ScrollArea } from '@/registry/new-york-v4/ui/scroll-area';
import { Skeleton } from '@/registry/new-york-v4/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/registry/new-york-v4/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/registry/new-york-v4/ui/tooltip';

import { Contract, ethers } from 'ethers';
import {
    AlertCircle,
    Braces,
    Clock,
    Code,
    Cpu,
    FileCode2,
    FileIcon,
    Globe,
    HardDrive,
    Info,
    Languages,
    Layers,
    MonitorCheck,
    RotateCw,
    ServerCrash,
    Terminal,
    Upload,
    UploadCloud,
    XCircle
} from 'lucide-react';

const CONTRACT_ADDRESS = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'; // your deployed address

const API_BASE_URL = 'https://56c6-2409-4085-28c-d21a-183c-2457-d23-9029.ngrok-free.app';

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

interface UploadOption {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    requirements: string[];
}

export default function SchedulerDashboard() {
    const [agents, setAgents] = useState<Record<string, Agent>>({});
    const [deployments, setDeployments] = useState<any>({});
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [selectedDeploymentId, setSelectedDeploymentId] = useState<string>('');
    const [deploymentInfo, setDeploymentInfo] = useState<DeploymentInfo | null>(null);
    const [selectedUploadType, setSelectedUploadType] = useState<string>('python');

    const [loadingAgents, setLoadingAgents] = useState(true);
    const [loadingDeployments, setLoadingDeployments] = useState(true);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [canceling, setCanceling] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);

    const uploadOptions: UploadOption[] = [
        {
            id: 'python',
            title: 'Python Script',
            description: 'Deploy a Python application or script',
            icon: <FileIcon className='size-8 text-blue-600' />,
            requirements: ['main.py file', 'requirements.txt', 'Dockerfile']
        },
        {
            id: 'nodejs',
            title: 'JavaScript/Node.js',
            description: 'Deploy a Node.js application',
            icon: <Braces className='size-8 text-yellow-500' />,
            requirements: ['index.js file', 'package.json', 'Dockerfile']
        },
        {
            id: 'golang',
            title: 'Go Application',
            description: 'Deploy a Go application',
            icon: <Globe className='size-8 text-blue-400' />,
            requirements: ['main.go file', 'go.mod', 'Dockerfile']
        },
        {
            id: 'ollama',
            title: 'Ollama Model',
            description: 'Deploy an Ollama LLM instance',
            icon: <Layers className='size-8 text-purple-500' />,
            requirements: ['Modelfile', 'model weights', 'Dockerfile']
        },
        {
            id: 'custom',
            title: 'Custom Container',
            description: 'Deploy any containerized application',
            icon: <FileCode2 className='size-8 text-gray-500' />,
            requirements: ['Source code', 'Dockerfile']
        }
    ];

    useEffect(() => {
        fetchAgents();
        fetchDeployments();
        const interval = setInterval(() => {
            fetchAgents();
            fetchDeployments();
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (isLoading) {
            const interval = setInterval(() => {
                setUploadProgress((prev) => {
                    const newProgress = prev + Math.random() * 10;
                    return newProgress >= 95 ? 95 : newProgress;
                });
            }, 500);
            return () => clearInterval(interval);
        } else {
            setUploadProgress(0);
        }
    }, [isLoading]);

    const fetchAgents = async () => {
        setLoadingAgents(true);
        try {
            const res = await fetch(`${API_BASE_URL}/agents`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            const data = await res.json();
            setAgents(data);
        } catch (err) {
            console.error('Failed to fetch agents:', err);
        } finally {
            setLoadingAgents(false);
        }
    };

    const fetchDeployments = async () => {
        setLoadingDeployments(true);
        try {
            const res = await fetch(`${API_BASE_URL}/deployments`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            const data = await res.json();
            setDeployments(data);
        } finally {
            setLoadingDeployments(false);
        }
    };

    const fetchLogs = async (deploymentId: string) => {
        setSelectedDeploymentId(deploymentId);
        setLoadingLogs(true);
        try {
            const res = await fetch(`${API_BASE_URL}/deployment_logs?deployment_id=${deploymentId}`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            const data = await res.json();
            setDeploymentInfo(data);
        } catch (err) {
            console.error('Log fetch error:', err);
        } finally {
            setLoadingLogs(false);
        }
    };

    const cancelDeployment = async () => {
        if (!selectedDeploymentId) return;
        const deployment = deployments[selectedDeploymentId];
        if (!deployment || deployment.status === 'failed') return;

        setCanceling(true);
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
        } finally {
            setCanceling(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setUploadFile(e.target.files[0]);
        }
    };

    const uploadCode = async () => {
        if (!uploadFile) return alert('Select a zip file.');

        // if (typeof window === 'undefined') {
        //     setUploadStatus('MetaMask not found. Please install or unlock it.');
        //     return;
        // }

        // if (!window.ethereum) {
        //     setUploadStatus('MetaMask not found. Please install or unlock it.');
        //     return;
        // }

        if (typeof window === 'undefined' || typeof window.ethereum === 'undefined') {
            setUploadStatus('MetaMask not found. Please install or unlock it.');
            return;
        }

        setUploadStatus('Preparing deployment...');
        setIsLoading(true);

        try {
            const formData = new FormData();
            formData.append('code', uploadFile);
            formData.append('type', selectedUploadType);

            const uploadRes = await fetch(`${API_BASE_URL}/upload_code`, {
                method: 'POST',
                headers: { 'ngrok-skip-browser-warning': 'true' },
                body: formData
            });

            const uploadData = await uploadRes.json();
            if (!uploadRes.ok) {
                setUploadStatus(uploadData.message || 'Upload failed');
                return;
            }

            setUploadStatus('Processing payment on blockchain...');
            setUploadProgress(70);

            const fileHash = uploadData.deployment_id || 'no-hash';
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new Contract(CONTRACT_ADDRESS, contractABI, signer);

            const tx = await contract.uploadFile(fileHash);
            await tx.wait();

            setUploadProgress(100);
            setUploadStatus(`Successfully deployed! Transaction hash: ${tx.hash.substring(0, 10)}...`);
            fetchDeployments();
        } catch (err) {
            console.error('Contract call failed:', err);
            setUploadStatus('Smart contract interaction failed');
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        if (status === 'running') {
            return <Badge className='bg-green-500'>Running</Badge>;
        } else if (status === 'failed') {
            return <Badge className='bg-red-500'>Failed</Badge>;
        } else if (status === 'pending') {
            return <Badge className='bg-yellow-500'>Pending</Badge>;
        } else {
            return <Badge className='bg-gray-500'>{status}</Badge>;
        }
    };

    const getTimeSince = (timestamp: number) => {
        const now = Math.floor(Date.now() / 1000);
        const seconds = now - timestamp;

        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    return (
        <div className='min-h-screen bg-gray-50 px-6 py-8 dark:bg-gray-950'>
            <div className='mx-auto max-w-7xl'>
                <header className='mb-6 flex items-center justify-between border-b border-gray-200 pb-4 dark:border-gray-800'>
                    <h1 className='flex items-center gap-2 text-3xl font-bold text-rose-700 dark:text-rose-300'>
                        <MonitorCheck className='size-7' />
                        <span>Scheduler Dashboard</span>
                    </h1>
                    <div className='flex items-center gap-2'>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        size='sm'
                                        variant='outline'
                                        onClick={() => {
                                            fetchAgents();
                                            fetchDeployments();
                                        }}
                                        className='gap-1'>
                                        <RotateCw className='size-4' />
                                        <span>Refresh</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Refresh all data</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </header>

                <Tabs defaultValue='deployments' className='space-y-6'>
                    <TabsList className='grid w-full max-w-md grid-cols-3'>
                        <TabsTrigger value='deployments'>Deployments</TabsTrigger>
                        <TabsTrigger value='agents'>Agents</TabsTrigger>
                        <TabsTrigger value='upload'>Upload & Deploy</TabsTrigger>
                    </TabsList>

                    {/* DEPLOYMENTS */}
                    <TabsContent value='deployments'>
                        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
                            <div className='lg:col-span-1'>
                                <Card className='min-h-[600px]'>
                                    <CardHeader>
                                        <CardTitle className='flex items-center gap-2 text-lg font-medium'>
                                            <Terminal className='size-4 text-rose-600' /> Active Deployments
                                        </CardTitle>
                                        <CardDescription>
                                            {Object.keys(deployments).length} deployment
                                            {Object.keys(deployments).length === 1 ? '' : 's'} running
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ScrollArea className='h-[500px] pr-4'>
                                            <div className='space-y-3'>
                                                {loadingDeployments ? (
                                                    [...Array(3)].map((_, i) => (
                                                        <Skeleton key={i} className='h-24 w-full rounded-md' />
                                                    ))
                                                ) : Object.keys(deployments).length === 0 ? (
                                                    <div className='flex flex-col items-center justify-center py-10 text-center text-gray-500'>
                                                        <ServerCrash className='mb-2 size-10' />
                                                        <p>No active deployments</p>
                                                        <p className='text-sm'>Upload code to get started</p>
                                                    </div>
                                                ) : (
                                                    Object.entries(deployments).map(([id, dep]: any) => (
                                                        <Card
                                                            key={id}
                                                            onClick={() => fetchLogs(id)}
                                                            className={`cursor-pointer transition-all hover:shadow-md ${
                                                                selectedDeploymentId === id
                                                                    ? 'shadow-md ring-2 ring-rose-400'
                                                                    : 'border'
                                                            }`}>
                                                            <CardContent className='space-y-1 p-4'>
                                                                <div className='flex items-center justify-between'>
                                                                    <p className='flex items-center gap-2 truncate font-medium text-rose-700'>
                                                                        <Terminal className='size-4' />
                                                                        <span className='truncate'>
                                                                            {id.substring(0, 12)}...
                                                                        </span>
                                                                    </p>
                                                                    {getStatusBadge(dep.status)}
                                                                </div>
                                                                <p className='flex items-center gap-1 text-sm text-gray-500'>
                                                                    <Cpu className='size-3' /> Agent:{' '}
                                                                    {dep.agent.split('.')[0]}...
                                                                </p>
                                                                <p className='flex items-center gap-1 text-sm text-gray-500'>
                                                                    <FileCode2 className='size-3' />{' '}
                                                                    {dep.image || 'Custom Image'}
                                                                </p>
                                                            </CardContent>
                                                        </Card>
                                                    ))
                                                )}
                                            </div>
                                        </ScrollArea>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Deployment Details Panel */}
                            <div className='lg:col-span-2'>
                                {selectedDeploymentId && deploymentInfo ? (
                                    <Card className='h-full border border-gray-200 dark:border-gray-800'>
                                        <CardHeader className='pb-3'>
                                            <div className='flex items-center justify-between'>
                                                <CardTitle className='text-xl font-semibold text-rose-700'>
                                                    Deployment Details
                                                </CardTitle>
                                                <Button
                                                    variant='destructive'
                                                    size='sm'
                                                    disabled={deploymentInfo.status === 'failed' || canceling}
                                                    onClick={cancelDeployment}
                                                    className='gap-2'>
                                                    <XCircle className='size-4' />
                                                    {canceling ? 'Canceling...' : 'Cancel Deployment'}
                                                </Button>
                                            </div>
                                            <CardDescription>
                                                ID: {selectedDeploymentId} • Status: {deploymentInfo.status}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className='space-y-4'>
                                            {loadingLogs ? (
                                                <div className='space-y-3'>
                                                    <Skeleton className='h-8 w-full' />
                                                    <Skeleton className='h-60 w-full' />
                                                </div>
                                            ) : (
                                                <>
                                                    <div className='rounded-lg bg-gray-100 p-4 dark:bg-gray-800'>
                                                        <h3 className='mb-2 font-medium'>Mapped Ports</h3>
                                                        {Object.keys(deploymentInfo.mapped_ports || {}).length === 0 ? (
                                                            <p className='text-sm text-gray-500'>No ports mapped</p>
                                                        ) : (
                                                            <div className='grid grid-cols-2 gap-2'>
                                                                {Object.entries(deploymentInfo.mapped_ports || {}).map(
                                                                    ([port, bindings]) => (
                                                                        <div
                                                                            key={port}
                                                                            className='rounded bg-white p-2 text-sm dark:bg-gray-700'>
                                                                            <span className='font-mono'>
                                                                                {port} →{' '}
                                                                                {Array.isArray(bindings)
                                                                                    ? bindings
                                                                                          .map(
                                                                                              (b) =>
                                                                                                  `${b.HostIp}:${b.HostPort}`
                                                                                          )
                                                                                          .join(', ')
                                                                                    : JSON.stringify(bindings)}
                                                                            </span>
                                                                        </div>
                                                                    )
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <div className='mb-2 flex items-center justify-between'>
                                                            <h3 className='font-medium'>Container Logs</h3>
                                                            <Badge variant='outline' className='font-mono text-xs'>
                                                                stdout/stderr
                                                            </Badge>
                                                        </div>
                                                        <div className='relative'>
                                                            <pre className='max-h-64 overflow-y-auto rounded bg-black p-3 font-mono text-xs text-green-200'>
                                                                {deploymentInfo.logs || 'No logs available'}
                                                            </pre>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <Card className='flex h-full flex-col items-center justify-center p-6 text-center text-gray-500'>
                                        <Info className='mb-4 size-12 text-gray-400' />
                                        <h3 className='mb-2 text-xl font-medium'>Deployment Details</h3>
                                        <p className='max-w-md'>
                                            Select a deployment from the list to view detailed information, logs, and
                                            available ports.
                                        </p>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    {/* AGENTS */}
                    <TabsContent value='agents'>
                        <div className='grid gap-4 md:grid-cols-3 lg:grid-cols-4'>
                            {loadingAgents ? (
                                [...Array(8)].map((_, i) => <Skeleton key={i} className='h-36 w-full rounded-md' />)
                            ) : Object.keys(agents).length === 0 ? (
                                <div className='col-span-full flex flex-col items-center justify-center py-16 text-center text-gray-500'>
                                    <ServerCrash className='mb-4 size-16' />
                                    <h3 className='mb-2 text-xl font-medium'>No Agents Connected</h3>
                                    <p>There are currently no compute agents connected to the network.</p>
                                </div>
                            ) : (
                                Object.entries(agents).map(([id, agent]) => (
                                    <Card key={id} className='overflow-hidden'>
                                        <CardHeader
                                            className={`pb-2 ${agent.state === 'Free' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                                            <CardTitle className='text-base font-medium'>
                                                <div className='flex items-center justify-between'>
                                                    <span className='font-mono text-gray-700 dark:text-gray-300'>
                                                        {id.substring(0, 10)}...
                                                    </span>
                                                    <Badge
                                                        className={
                                                            agent.state === 'Free' ? 'bg-green-500' : 'bg-red-500'
                                                        }>
                                                        {agent.state}
                                                    </Badge>
                                                </div>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className='space-y-3 p-4 text-sm'>
                                            <div className='flex items-center text-gray-600 dark:text-gray-400'>
                                                <Globe className='mr-2 size-4' />
                                                <span className='font-mono'>{agent.ip}</span>
                                            </div>

                                            <div className='space-y-1'>
                                                <div className='flex items-center justify-between'>
                                                    <div className='flex items-center text-gray-600 dark:text-gray-400'>
                                                        <Cpu className='mr-2 size-4' />
                                                        <span>CPU Usage</span>
                                                    </div>
                                                    <span
                                                        className={`font-medium ${agent.cpu > 80 ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
                                                        {agent.cpu}%
                                                    </span>
                                                </div>
                                                <Progress
                                                    value={agent.cpu}
                                                    className='h-1 bg-gray-200 dark:bg-gray-700'
                                                />
                                            </div>

                                            <div className='space-y-1'>
                                                <div className='flex items-center justify-between'>
                                                    <div className='flex items-center text-gray-600 dark:text-gray-400'>
                                                        <HardDrive className='mr-2 size-4' />
                                                        <span>Memory Usage</span>
                                                    </div>
                                                    <span className='font-medium text-gray-700 dark:text-gray-300'>
                                                        {agent.memory}MB
                                                    </span>
                                                </div>
                                                <Progress
                                                    value={(agent.memory / 8192) * 100}
                                                    className='h-1 bg-gray-200 dark:bg-gray-700'
                                                />
                                            </div>

                                            <div className='flex items-center justify-between border-t border-gray-100 pt-1 text-gray-600 dark:border-gray-800 dark:text-gray-400'>
                                                <div className='flex items-center'>
                                                    <Clock className='mr-2 size-4' />
                                                    <span>Last Seen</span>
                                                </div>
                                                <span className='text-gray-700 dark:text-gray-300'>
                                                    {getTimeSince(agent.last_seen)}
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    </TabsContent>

                    {/* UPLOAD */}
                    <TabsContent value='upload'>
                        <div className='grid gap-6 md:grid-cols-2'>
                            <div>
                                <h2 className='mb-4 flex items-center gap-2 text-xl font-medium text-rose-700 dark:text-rose-300'>
                                    <UploadCloud className='size-5' />
                                    <span>Upload & Deploy</span>
                                </h2>

                                <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
                                    {uploadOptions.map((option) => (
                                        <Card
                                            key={option.id}
                                            className={`cursor-pointer transition-all hover:shadow ${
                                                selectedUploadType === option.id ? 'shadow-sm ring-2 ring-rose-500' : ''
                                            }`}
                                            onClick={() => setSelectedUploadType(option.id)}>
                                            <CardContent className='flex flex-col items-center p-4 text-center'>
                                                <div className='py-3'>{option.icon}</div>
                                                <h3 className='font-medium'>{option.title}</h3>
                                                <p className='mt-1 text-xs text-gray-500'>{option.description}</p>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>

                                <div className='mt-6 rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800'>
                                    <h3 className='mb-2 flex items-center gap-2 font-semibold'>
                                        <AlertCircle className='size-4 text-amber-500' />
                                        <span>
                                            Requirements for{' '}
                                            {uploadOptions.find((o) => o.id === selectedUploadType)?.title}
                                        </span>
                                    </h3>
                                    <ul className='list-disc space-y-1 pl-6 text-sm text-gray-600 dark:text-gray-400'>
                                        {uploadOptions
                                            .find((o) => o.id === selectedUploadType)
                                            ?.requirements.map((req, idx) => <li key={idx}>{req}</li>)}
                                        <li className='font-medium text-rose-600'>
                                            Must be a .zip file containing all required files
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <div>
                                <Card className='bg-white dark:bg-gray-800'>
                                    <CardHeader>
                                        <CardTitle className='text-lg'>Deploy Your Application</CardTitle>
                                        <CardDescription>Upload your code and deploy it to the network</CardDescription>
                                    </CardHeader>
                                    <CardContent className='space-y-4'>
                                        <div className='grid w-full max-w-lg items-center gap-1.5'>
                                            <label htmlFor='file-upload' className='text-sm font-medium'>
                                                Select ZIP File
                                            </label>
                                            <Input
                                                id='file-upload'
                                                type='file'
                                                accept='.zip'
                                                onChange={handleFileChange}
                                                className='cursor-pointer'
                                            />
                                            <p className='text-xs text-gray-500'>
                                                Upload a ZIP file containing your application code and Dockerfile
                                            </p>
                                        </div>

                                        {uploadFile && (
                                            <div className='rounded-lg bg-gray-50 p-3 dark:bg-gray-900'>
                                                <div className='flex items-center gap-2'>
                                                    <FileCode2 className='size-4 text-rose-600' />
                                                    <span className='font-medium'>{uploadFile.name}</span>
                                                    <Badge variant='outline' className='ml-auto'>
                                                        {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                                                    </Badge>
                                                </div>
                                            </div>
                                        )}

                                        {isLoading && (
                                            <div className='space-y-2'>
                                                <div className='flex items-center justify-between'>
                                                    <span className='text-sm'>{uploadStatus}</span>
                                                    <span className='text-sm font-medium'>
                                                        {Math.round(uploadProgress)}%
                                                    </span>
                                                </div>
                                                <Progress value={uploadProgress} className='h-2' />
                                            </div>
                                        )}

                                        {!isLoading && uploadStatus && (
                                            <div
                                                className={`rounded-lg p-3 text-sm ${
                                                    uploadStatus.includes('Successfully')
                                                        ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                                        : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                                }`}>
                                                {uploadStatus}
                                            </div>
                                        )}
                                    </CardContent>
                                    <CardFooter>
                                        <Button
                                            onClick={uploadCode}
                                            disabled={isLoading || !uploadFile}
                                            className='w-full bg-rose-600 hover:bg-rose-700'>
                                            {isLoading ? (
                                                <>
                                                    <RotateCw className='mr-2 size-4 animate-spin' />
                                                    <span>Processing...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <UploadCloud className='mr-2 size-4' />
                                                    <span>Deploy to Network</span>
                                                </>
                                            )}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
