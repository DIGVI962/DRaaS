'use client';

import { Badge } from '@/registry/new-york-v4/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/registry/new-york-v4/ui/card';
import { Progress } from '@/registry/new-york-v4/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/registry/new-york-v4/ui/tooltip';

import { Clock, Cpu, Globe, HardDrive, Shield } from 'lucide-react';

interface AgentProps {
    id: string;
    agent: {
        ip: string;
        cpu: number;
        memory: number;
        last_seen: number;
        state: string;
        Reuptation?: number; // Optional as it may not be present in all agent objects
    };
}

export const AgentCard = ({ id, agent }: AgentProps) => {
    const getTimeSince = (timestamp: number) => {
        const now = Math.floor(Date.now() / 1000);
        const seconds = now - timestamp;

        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    const reputation = agent.Reuptation || 0;

    // Get reputation color
    const getReputationColor = (rep: number) => {
        if (rep >= 90) return 'text-green-500';
        if (rep >= 70) return 'text-yellow-500';
        return 'text-red-500';
    };

    return (
        <Card className='overflow-hidden'>
            <CardHeader
                className={`pb-2 ${
                    agent.state === 'Free' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
                }`}>
                <CardTitle className='text-base font-medium'>
                    <div className='flex items-center justify-between'>
                        <span className='font-mono text-gray-700 dark:text-gray-300'>{id.substring(0, 10)}...</span>
                        <Badge className={agent.state === 'Free' ? 'bg-green-500' : 'bg-red-500'}>{agent.state}</Badge>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3 p-4 text-sm'>
                <div className='flex items-center text-gray-600 dark:text-gray-400'>
                    <Globe className='mr-2 size-4' />
                    <span className='font-mono'>{agent.ip}</span>
                </div>

                <div className='flex items-center justify-between'>
                    <div className='flex items-center text-gray-600 dark:text-gray-400'>
                        <Shield className='mr-2 size-4' />
                        <span>Reputation</span>
                    </div>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className={`font-medium ${getReputationColor(reputation)}`}>{reputation}%</span>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Agent reliability score</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>

                <div className='space-y-1'>
                    <div className='flex items-center justify-between'>
                        <div className='flex items-center text-gray-600 dark:text-gray-400'>
                            <Cpu className='mr-2 size-4' />
                            <span>CPU Usage</span>
                        </div>
                        <span
                            className={`font-medium ${
                                agent.cpu > 80 ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'
                            }`}>
                            {agent.cpu}%
                        </span>
                    </div>
                    <Progress value={agent.cpu} className='h-1 bg-gray-200 dark:bg-gray-700' />
                </div>

                <div className='space-y-1'>
                    <div className='flex items-center justify-between'>
                        <div className='flex items-center text-gray-600 dark:text-gray-400'>
                            <HardDrive className='mr-2 size-4' />
                            <span>Memory Usage</span>
                        </div>
                        <span className='font-medium text-gray-700 dark:text-gray-300'>{agent.memory}MB</span>
                    </div>
                    <Progress value={(agent.memory / 8192) * 100} className='h-1 bg-gray-200 dark:bg-gray-700' />
                </div>

                <div className='flex items-center justify-between border-t border-gray-100 pt-1 text-gray-600 dark:border-gray-800 dark:text-gray-400'>
                    <div className='flex items-center'>
                        <Clock className='mr-2 size-4' />
                        <span>Last Seen</span>
                    </div>
                    <span className='text-gray-700 dark:text-gray-300'>{getTimeSince(agent.last_seen)}</span>
                </div>
            </CardContent>
        </Card>
    );
};

export default AgentCard;
