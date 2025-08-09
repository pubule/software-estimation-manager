/**
 * Team Manager - TDD Test Suite
 * 
 * Tests for team member CRUD operations and vacation management.
 * This test suite drives the implementation of TeamManager following
 * Test-Driven Development practices.
 */

describe('TeamManager - TDD Implementation', () => {
    let manager;
    let mockDataManager;
    let mockConfigManager;
    
    beforeEach(() => {
        // Mock dependencies
        mockDataManager = {
            saveTeamMembers: jest.fn().mockResolvedValue(true),
            loadTeamMembers: jest.fn().mockResolvedValue([]),
            saveData: jest.fn().mockResolvedValue(true)
        };
        
        mockConfigManager = {
            getSuppliers: jest.fn().mockReturnValue([
                { id: 'vendor-a', name: 'Vendor A', type: 'external' },
                { id: 'internal', name: 'Internal Resources', type: 'internal' }
            ]),
            getInternalResources: jest.fn().mockReturnValue([
                { id: 'internal-1', name: 'Senior Developer' }
            ])
        };
        
        // TeamManager implementation will be created to pass these tests
        manager = new TeamManager(mockDataManager, mockConfigManager);
    });

    describe('Team Member CRUD Operations', () => {
        test('TDD: Create a new team member with valid data', async () => {
            const teamMemberData = {
                firstName: 'Mario',
                lastName: 'Rossi',
                vendor: 'vendor-a',
                role: 'G2',
                monthlyCapacity: 22,
                vacationDays: {
                    2024: ['2024-07-15', '2024-07-16']
                }
            };

            const result = await manager.createTeamMember(teamMemberData);

            expect(result.success).toBe(true);
            expect(result.teamMember.id).toBeDefined();
            expect(result.teamMember.firstName).toBe('Mario');
            expect(result.teamMember.lastName).toBe('Rossi');
            expect(result.teamMember.created).toBeDefined();
            expect(result.teamMember.lastModified).toBeDefined();
            expect(mockDataManager.saveTeamMembers).toHaveBeenCalled();
        });

        test('TDD: Create team member with minimal required data', async () => {
            const minimalData = {
                firstName: 'Anna',
                lastName: 'Bianchi',
                vendor: 'internal'
            };

            const result = await manager.createTeamMember(minimalData);

            expect(result.success).toBe(true);
            expect(result.teamMember.role).toBe('G2'); // Default value
            expect(result.teamMember.monthlyCapacity).toBe(22); // Default value
            expect(result.teamMember.vacationDays).toEqual({}); // Default empty
        });

        test('TDD: Reject team member creation with invalid data', async () => {
            const invalidData = {
                firstName: '', // Empty first name
                lastName: 'Rossi',
                vendor: 'invalid-vendor'
            };

            const result = await manager.createTeamMember(invalidData);

            expect(result.success).toBe(false);
            expect(result.errors).toBeDefined();
            expect(result.errors.firstName).toBeDefined();
            expect(result.errors.vendor).toBeDefined();
            expect(mockDataManager.saveTeamMembers).not.toHaveBeenCalled();
        });

        test('TDD: Update existing team member data', async () => {
            // First create a team member
            const createData = {
                firstName: 'Luca',
                lastName: 'Verdi',
                vendor: 'vendor-a',
                role: 'G1'
            };
            
            const createResult = await manager.createTeamMember(createData);
            const teamMemberId = createResult.teamMember.id;

            // Then update it
            const updateData = {
                firstName: 'Luca',
                lastName: 'Verdi',
                vendor: 'internal',
                role: 'PM',
                monthlyCapacity: 20
            };

            const updateResult = await manager.updateTeamMember(teamMemberId, updateData);

            expect(updateResult.success).toBe(true);
            expect(updateResult.teamMember.vendor).toBe('internal');
            expect(updateResult.teamMember.role).toBe('PM');
            expect(updateResult.teamMember.monthlyCapacity).toBe(20);
            expect(updateResult.teamMember.lastModified).toBeDefined();
        });

        test('TDD: Delete team member', async () => {
            // Create team member first
            const createData = {
                firstName: 'Sofia',
                lastName: 'Russo',
                vendor: 'vendor-a'
            };
            
            const createResult = await manager.createTeamMember(createData);
            const teamMemberId = createResult.teamMember.id;

            // Delete the team member
            const deleteResult = await manager.deleteTeamMember(teamMemberId);

            expect(deleteResult.success).toBe(true);
            expect(mockDataManager.saveTeamMembers).toHaveBeenCalled();
        });

        test('TDD: Prevent deletion of team member with active assignments', async () => {
            // Mock team member with active projects
            manager._teamMembers = [{
                id: 'tm-001',
                firstName: 'Marco',
                lastName: 'Neri',
                hasActiveAssignments: true
            }];

            const deleteResult = await manager.deleteTeamMember('tm-001');

            expect(deleteResult.success).toBe(false);
            expect(deleteResult.error).toContain('active project assignments');
            expect(mockDataManager.saveTeamMembers).not.toHaveBeenCalled();
        });
    });

    describe('Team Member Retrieval', () => {
        test('TDD: Get all team members', async () => {
            // Mock existing team members
            mockDataManager.loadTeamMembers.mockResolvedValue([
                {
                    id: 'tm-001',
                    firstName: 'Mario',
                    lastName: 'Rossi',
                    vendor: 'vendor-a',
                    role: 'G2'
                },
                {
                    id: 'tm-002',
                    firstName: 'Anna',
                    lastName: 'Bianchi',
                    vendor: 'internal',
                    role: 'PM'
                }
            ]);

            await manager.loadTeamMembers();
            const allMembers = manager.getAllTeamMembers();

            expect(allMembers).toHaveLength(2);
            expect(allMembers[0].firstName).toBe('Mario');
            expect(allMembers[1].firstName).toBe('Anna');
        });

        test('TDD: Get team member by ID', async () => {
            manager._teamMembers = [
                {
                    id: 'tm-001',
                    firstName: 'Luca',
                    lastName: 'Verdi',
                    vendor: 'vendor-a'
                }
            ];

            const member = manager.getTeamMemberById('tm-001');

            expect(member).toBeDefined();
            expect(member.firstName).toBe('Luca');
            expect(member.lastName).toBe('Verdi');
        });

        test('TDD: Return null for non-existent team member ID', () => {
            const member = manager.getTeamMemberById('non-existent');
            expect(member).toBeNull();
        });

        test('TDD: Get team members by vendor', async () => {
            manager._teamMembers = [
                {
                    id: 'tm-001',
                    firstName: 'Mario',
                    lastName: 'Rossi',
                    vendor: 'vendor-a'
                },
                {
                    id: 'tm-002',
                    firstName: 'Anna',
                    lastName: 'Bianchi',
                    vendor: 'vendor-a'
                },
                {
                    id: 'tm-003',
                    firstName: 'Luca',
                    lastName: 'Verdi',
                    vendor: 'internal'
                }
            ];

            const vendorAMembers = manager.getTeamMembersByVendor('vendor-a');

            expect(vendorAMembers).toHaveLength(2);
            expect(vendorAMembers[0].firstName).toBe('Mario');
            expect(vendorAMembers[1].firstName).toBe('Anna');
        });
    });

    describe('Vacation Management', () => {
        test('TDD: Add vacation days to team member', async () => {
            manager._teamMembers = [
                {
                    id: 'tm-001',
                    firstName: 'Mario',
                    lastName: 'Rossi',
                    vacationDays: { 2024: [] }
                }
            ];

            const vacationDates = ['2024-07-15', '2024-07-16', '2024-07-17'];
            const result = await manager.addVacationDays('tm-001', 2024, vacationDates);

            expect(result.success).toBe(true);
            
            const member = manager.getTeamMemberById('tm-001');
            expect(member.vacationDays[2024]).toContain('2024-07-15');
            expect(member.vacationDays[2024]).toContain('2024-07-16');
            expect(member.vacationDays[2024]).toContain('2024-07-17');
            expect(member.lastModified).toBeDefined();
        });

        test('TDD: Remove vacation days from team member', async () => {
            manager._teamMembers = [
                {
                    id: 'tm-001',
                    firstName: 'Mario',
                    lastName: 'Rossi',
                    vacationDays: {
                        2024: ['2024-07-15', '2024-07-16', '2024-07-17']
                    }
                }
            ];

            const datesToRemove = ['2024-07-16'];
            const result = await manager.removeVacationDays('tm-001', 2024, datesToRemove);

            expect(result.success).toBe(true);
            
            const member = manager.getTeamMemberById('tm-001');
            expect(member.vacationDays[2024]).toContain('2024-07-15');
            expect(member.vacationDays[2024]).not.toContain('2024-07-16');
            expect(member.vacationDays[2024]).toContain('2024-07-17');
        });

        test('TDD: Get vacation days for team member in specific month', () => {
            manager._teamMembers = [
                {
                    id: 'tm-001',
                    firstName: 'Mario',
                    lastName: 'Rossi',
                    vacationDays: {
                        2024: ['2024-07-15', '2024-07-16', '2024-08-20']
                    }
                }
            ];

            const julyVacations = manager.getVacationDaysInMonth('tm-001', '2024-07');

            expect(julyVacations).toHaveLength(2);
            expect(julyVacations).toContain('2024-07-15');
            expect(julyVacations).toContain('2024-07-16');
            expect(julyVacations).not.toContain('2024-08-20');
        });

        test('TDD: Calculate total vacation days for year', () => {
            manager._teamMembers = [
                {
                    id: 'tm-001',
                    firstName: 'Mario',
                    lastName: 'Rossi',
                    vacationDays: {
                        2024: ['2024-07-15', '2024-07-16', '2024-08-20', '2024-12-23']
                    }
                }
            ];

            const totalVacationDays = manager.getTotalVacationDaysForYear('tm-001', 2024);

            expect(totalVacationDays).toBe(4);
        });

        test('TDD: Handle vacation days for year with no data', () => {
            manager._teamMembers = [
                {
                    id: 'tm-001',
                    firstName: 'Mario',
                    lastName: 'Rossi',
                    vacationDays: {}
                }
            ];

            const totalVacationDays = manager.getTotalVacationDaysForYear('tm-001', 2024);

            expect(totalVacationDays).toBe(0);
        });
    });

    describe('Data Validation', () => {
        test('TDD: Validate required fields for team member creation', async () => {
            const invalidData = {};

            const result = await manager.createTeamMember(invalidData);

            expect(result.success).toBe(false);
            expect(result.errors.firstName).toBeDefined();
            expect(result.errors.lastName).toBeDefined();
            expect(result.errors.vendor).toBeDefined();
        });

        test('TDD: Validate vendor exists in configuration', async () => {
            const invalidVendorData = {
                firstName: 'Mario',
                lastName: 'Rossi',
                vendor: 'non-existent-vendor'
            };

            const result = await manager.createTeamMember(invalidVendorData);

            expect(result.success).toBe(false);
            expect(result.errors.vendor).toContain('Invalid vendor');
        });

        test('TDD: Validate role values', async () => {
            const invalidRoleData = {
                firstName: 'Mario',
                lastName: 'Rossi',
                vendor: 'vendor-a',
                role: 'INVALID_ROLE'
            };

            const result = await manager.createTeamMember(invalidRoleData);

            expect(result.success).toBe(false);
            expect(result.errors.role).toContain('Invalid role');
        });

        test('TDD: Validate monthly capacity is positive number', async () => {
            const invalidCapacityData = {
                firstName: 'Mario',
                lastName: 'Rossi',
                vendor: 'vendor-a',
                monthlyCapacity: -5
            };

            const result = await manager.createTeamMember(invalidCapacityData);

            expect(result.success).toBe(false);
            expect(result.errors.monthlyCapacity).toContain('must be positive');
        });

        test('TDD: Validate vacation dates format', async () => {
            const invalidVacationData = {
                firstName: 'Mario',
                lastName: 'Rossi',
                vendor: 'vendor-a',
                vacationDays: {
                    2024: ['invalid-date-format', '2024-07-16']
                }
            };

            const result = await manager.createTeamMember(invalidVacationData);

            expect(result.success).toBe(false);
            expect(result.errors.vacationDays).toContain('Invalid date format');
        });
    });

    describe('Data Persistence', () => {
        test('TDD: Load team members on manager initialization', async () => {
            const mockTeamMembers = [
                {
                    id: 'tm-001',
                    firstName: 'Mario',
                    lastName: 'Rossi',
                    vendor: 'vendor-a'
                }
            ];

            mockDataManager.loadTeamMembers.mockResolvedValue(mockTeamMembers);

            await manager.loadTeamMembers();

            expect(mockDataManager.loadTeamMembers).toHaveBeenCalled();
            expect(manager._teamMembers).toHaveLength(1);
            expect(manager._teamMembers[0].firstName).toBe('Mario');
        });

        test('TDD: Save team members after create operations', async () => {
            const teamMemberData = {
                firstName: 'Anna',
                lastName: 'Bianchi',
                vendor: 'internal'
            };

            await manager.createTeamMember(teamMemberData);

            expect(mockDataManager.saveTeamMembers).toHaveBeenCalledWith(manager._teamMembers);
        });

        test('TDD: Save team members after update operations', async () => {
            manager._teamMembers = [
                {
                    id: 'tm-001',
                    firstName: 'Mario',
                    lastName: 'Rossi',
                    vendor: 'vendor-a'
                }
            ];

            const updateData = {
                firstName: 'Mario',
                lastName: 'Rossi',
                vendor: 'internal'
            };

            await manager.updateTeamMember('tm-001', updateData);

            expect(mockDataManager.saveTeamMembers).toHaveBeenCalledWith(manager._teamMembers);
        });

        test('TDD: Handle save failures gracefully', async () => {
            mockDataManager.saveTeamMembers.mockRejectedValue(new Error('Save failed'));

            const teamMemberData = {
                firstName: 'Sofia',
                lastName: 'Russo',
                vendor: 'vendor-a'
            };

            const result = await manager.createTeamMember(teamMemberData);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Save failed');
        });
    });

    describe('Integration with Configuration', () => {
        test('TDD: Get available vendors from configuration', () => {
            const vendors = manager.getAvailableVendors();

            expect(vendors).toHaveLength(2);
            expect(vendors[0].id).toBe('vendor-a');
            expect(vendors[1].id).toBe('internal');
            expect(mockConfigManager.getSuppliers).toHaveBeenCalled();
        });

        test('TDD: Get available roles list', () => {
            const roles = manager.getAvailableRoles();

            expect(roles).toContain('G1');
            expect(roles).toContain('G2');
            expect(roles).toContain('PM');
            expect(roles).toContain('TA');
        });

        test('TDD: Validate vendor against configuration on create', async () => {
            mockConfigManager.getSuppliers.mockReturnValue([
                { id: 'only-vendor', name: 'Only Vendor' }
            ]);

            const invalidVendorData = {
                firstName: 'Mario',
                lastName: 'Rossi',
                vendor: 'vendor-a' // Not in the mock suppliers list
            };

            const result = await manager.createTeamMember(invalidVendorData);

            expect(result.success).toBe(false);
            expect(result.errors.vendor).toBeDefined();
        });
    });

    describe('Search and Filtering', () => {
        test('TDD: Search team members by name', () => {
            manager._teamMembers = [
                {
                    id: 'tm-001',
                    firstName: 'Mario',
                    lastName: 'Rossi',
                    vendor: 'vendor-a'
                },
                {
                    id: 'tm-002',
                    firstName: 'Anna',
                    lastName: 'Bianchi',
                    vendor: 'internal'
                },
                {
                    id: 'tm-003',
                    firstName: 'Maria',
                    lastName: 'Verdi',
                    vendor: 'vendor-a'
                }
            ];

            const searchResults = manager.searchTeamMembers('Mar');

            expect(searchResults).toHaveLength(2);
            expect(searchResults[0].firstName).toBe('Mario');
            expect(searchResults[1].firstName).toBe('Maria');
        });

        test('TDD: Filter team members by role', () => {
            manager._teamMembers = [
                {
                    id: 'tm-001',
                    firstName: 'Mario',
                    lastName: 'Rossi',
                    role: 'G2'
                },
                {
                    id: 'tm-002',
                    firstName: 'Anna',
                    lastName: 'Bianchi',
                    role: 'PM'
                },
                {
                    id: 'tm-003',
                    firstName: 'Luca',
                    lastName: 'Verdi',
                    role: 'G2'
                }
            ];

            const g2Members = manager.filterTeamMembersByRole('G2');

            expect(g2Members).toHaveLength(2);
            expect(g2Members[0].firstName).toBe('Mario');
            expect(g2Members[1].firstName).toBe('Luca');
        });
    });
});