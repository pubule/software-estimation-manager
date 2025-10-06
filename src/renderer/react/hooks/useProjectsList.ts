/**
 * useProjectsList Hook
 *
 * Custom hook for loading and managing the list of available projects
 * for allocation assignment dropdown
 *
 * Features:
 * - Loads saved projects from file system
 * - Includes current project if available
 * - Provides refresh functionality
 * - Handles loading and error states
 */

import { useState, useEffect } from 'react';
import { useStore } from './useStore';

export interface ProjectOption {
    id: string;
    name: string;
    isCurrent: boolean;
    filePath?: string;
}

export const useProjectsList = () => {
    const [projects, setProjects] = useState<ProjectOption[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Get current project from store
    const currentProject = useStore((state: any) => state.currentProject);

    // Load projects list
    const loadProjects = async () => {
        try {
            setLoading(true);
            setError(null);

            // Wait for electronAPI to be available (with retry logic)
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds max wait

            while (attempts < maxAttempts) {
                if (window.electronAPI?.listProjects) {
                    break;
                }

                if (attempts === 0) {
                    console.log('⏳ useProjectsList: Waiting for electronAPI to load...');
                }

                attempts++;
                if (attempts >= maxAttempts) {
                    console.warn('⚠️ useProjectsList: electronAPI not available after 5 seconds');
                    // Continue with just current project
                    break;
                }

                await new Promise(resolve => setTimeout(resolve, 100));
            }

            const projectsList: ProjectOption[] = [];

            // Add current project if available
            if (currentProject?.project) {
                const projectId = currentProject.project.id || currentProject.project.code;
                const projectName = currentProject.project.name;

                console.log('✅ useProjectsList: Adding current project:', projectId, projectName);

                projectsList.push({
                    id: projectId,
                    name: projectName,
                    isCurrent: true
                });
            }

            // Load saved projects from Electron API (reads from configured folder)
            if (window.electronAPI?.listProjects) {
                console.log('📂 useProjectsList: Calling electronAPI.listProjects()...');

                try {
                    const result = await window.electronAPI.listProjects();
                    console.log('📂 useProjectsList: electronAPI response:', result);

                    if (result?.success && result.projects && Array.isArray(result.projects)) {
                        console.log(`📂 useProjectsList: Retrieved ${result.projects.length} project(s) from configured folder`);

                        result.projects.forEach((savedProject: any) => {
                            // Don't add current project twice
                            const projectId = savedProject.project?.id || savedProject.project?.code;
                            const projectName = savedProject.project?.name;
                            const isAlreadyAdded = projectsList.some(p => p.id === projectId);

                            if (!isAlreadyAdded && savedProject.project && projectId && projectName) {
                                console.log('  ➕ Adding saved project:', projectId, projectName);
                                projectsList.push({
                                    id: projectId,
                                    name: projectName,
                                    isCurrent: false,
                                    filePath: savedProject.filePath
                                });
                            } else if (isAlreadyAdded) {
                                console.log('  ⏭️  Skipping duplicate:', projectId);
                            }
                        });
                    } else if (result?.success === false) {
                        console.error('❌ useProjectsList: electronAPI.listProjects() failed:', result.error);
                    }
                } catch (apiError: any) {
                    console.error('❌ useProjectsList: Error calling electronAPI.listProjects():', apiError);
                }
            } else {
                console.warn('⚠️ useProjectsList: electronAPI.listProjects not available, showing only current project');
            }

            // Sort: current project first, then alphabetically by name
            projectsList.sort((a, b) => {
                if (a.isCurrent && !b.isCurrent) return -1;
                if (!a.isCurrent && b.isCurrent) return 1;
                return a.name.localeCompare(b.name);
            });

            console.log(`✅ useProjectsList: Loaded ${projectsList.length} project(s) total`);
            setProjects(projectsList);
            setLoading(false);

        } catch (err: any) {
            console.error('❌ useProjectsList: Error loading projects list:', err);
            setError(err.message || 'Failed to load projects');
            setLoading(false);
        }
    };

    // Load projects on mount
    useEffect(() => {
        loadProjects();
    }, [currentProject]); // Reload when current project changes

    // Refresh function
    const refresh = () => {
        loadProjects();
    };

    return {
        projects,
        loading,
        error,
        refresh
    };
};
