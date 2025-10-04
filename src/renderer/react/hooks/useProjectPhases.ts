/**
 * useProjectPhases Hook
 *
 * Custom hook for loading project phases when a project is selected
 * Used in AssignmentModal to show phase-specific allocation fields
 *
 * Features:
 * - Loads project data from file system when projectId changes
 * - Extracts phases from project structure
 * - Returns phases in format ready for allocation UI
 */

import { useState, useEffect } from 'react';

export interface ProjectPhase {
    id: string;
    name: string;
    description?: string;
    type?: string;
    manDays?: number;
    editable: boolean;
}

export const useProjectPhases = (projectId: string | null, projectsList: any[]) => {
    const [phases, setPhases] = useState<ProjectPhase[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!projectId) {
            setPhases([]);
            setLoading(false);
            return;
        }

        loadProjectPhases();
    }, [projectId]); // Reload when projectId changes

    const loadProjectPhases = async () => {
        try {
            setLoading(true);
            setError(null);

            console.log('📋 useProjectPhases: Loading phases for project:', projectId);

            // Find project in projectsList to get filePath
            const project = projectsList.find(p => p.id === projectId);

            if (!project || !project.filePath) {
                console.warn('⚠️ useProjectPhases: Project not found or no filePath:', projectId);

                // Try to load from store (current project)
                const store = window.appStore?.getState();
                const currentProject = store?.currentProject;

                if (currentProject?.project?.id === projectId || currentProject?.project?.code === projectId) {
                    // Use phases from current project in store
                    const storePhaseDefs = store.phaseDefinitions || [];
                    const storePhases = store.currentPhases || [];

                    console.log('✅ useProjectPhases: Using phases from current project in store');

                    // Prefer currentPhases if available, fallback to phaseDefinitions
                    const phasesToUse = storePhases.length > 0 ? storePhases : storePhaseDefs;

                    const mappedPhases: ProjectPhase[] = phasesToUse.map((phase: any) => ({
                        id: phase.id,
                        name: phase.name,
                        description: phase.description,
                        type: phase.type,
                        manDays: phase.manDays || 0,
                        editable: phase.editable !== false
                    }));

                    setPhases(mappedPhases);
                    setLoading(false);
                    return;
                }

                throw new Error('Project file path not found');
            }

            // Load project from file system
            if (!window.electronAPI?.loadProjectFile) {
                throw new Error('electronAPI not available');
            }

            console.log('📂 useProjectPhases: Loading project file:', project.filePath);

            const result = await window.electronAPI.loadProjectFile(project.filePath);

            if (!result.success || !result.data) {
                throw new Error(result.error || 'Failed to load project file');
            }

            const projectData = result.data;
            console.log('📂 useProjectPhases: Project loaded:', projectData);

            // Extract phases from project
            // Try multiple possible locations for phases data
            let projectPhases: any[] = [];

            if (projectData.phases && Array.isArray(projectData.phases)) {
                projectPhases = projectData.phases;
            } else if (projectData.currentPhases && Array.isArray(projectData.currentPhases)) {
                projectPhases = projectData.currentPhases;
            } else if (projectData.phaseDefinitions && Array.isArray(projectData.phaseDefinitions)) {
                projectPhases = projectData.phaseDefinitions;
            }

            if (projectPhases.length === 0) {
                console.warn('⚠️ useProjectPhases: No phases found in project, using defaults');

                // Use default phase definitions from store
                const store = window.appStore?.getState();
                const defaultPhases = store?.phaseDefinitions || [];

                projectPhases = defaultPhases.map((def: any) => ({
                    ...def,
                    manDays: 0
                }));
            }

            console.log(`✅ useProjectPhases: Found ${projectPhases.length} phase(s)`);

            // Map to our interface
            const mappedPhases: ProjectPhase[] = projectPhases.map((phase: any) => ({
                id: phase.id,
                name: phase.name,
                description: phase.description,
                type: phase.type,
                manDays: phase.manDays || 0,
                editable: phase.editable !== false
            }));

            setPhases(mappedPhases);
            setLoading(false);

        } catch (err: any) {
            console.error('❌ useProjectPhases: Error loading project phases:', err);
            setError(err.message || 'Failed to load project phases');
            setLoading(false);
        }
    };

    return {
        phases,
        loading,
        error
    };
};
