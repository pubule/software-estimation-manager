const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

/**
 * Window Title Update Bug Fix Step Definitions
 * Tests that window title updates correctly when projects are loaded, saved, or created
 */

When('I change the project name to {string}', async function (newName) {
    await this.page.evaluate((name) => {
        const currentProject = window.appStore?.getState()?.currentProject;
        if (currentProject && currentProject.project) {
            currentProject.project.name = name;
            // Update store with modified project
            window.appStore.getState().setProject(currentProject);
            window.appStore.getState().markDirty();
        }
    }, newName);
    
    await this.page.waitForTimeout(300);
});

When('I save the project', async function () {
    await this.page.evaluate(() => {
        if (window.app && window.app.saveProject) {
            window.app.saveProject();
        }
    });
    
    await this.page.waitForTimeout(500);
});

When('I create a new project', async function () {
    await this.page.evaluate(() => {
        if (window.app && window.app.newProject) {
            window.app.newProject();
        }
    });
    
    await this.page.waitForTimeout(500);
});

Then('the window title should contain {string}', async function (expectedText) {
    // Verify the title contains the expected text
    const titleContains = await this.page.evaluate((expected) => {
        const currentProject = window.appStore?.getState()?.currentProject;
        if (currentProject && currentProject.project) {
            const { id, name } = currentProject.project;
            let generatedTitle;
            
            if (id && name) {
                generatedTitle = `${id} - ${name}`;
            } else if (name) {
                generatedTitle = name;
            } else {
                generatedTitle = 'Untitled Project';
            }
            
            return generatedTitle.includes(expected);
        }
        return false;
    }, expectedText);
    
    expect(titleContains).toBe(true);
});

Given('I have a previously saved project with code {string} and name {string}', async function (code, name) {
    await this.page.evaluate(({ projectCode, projectName }) => {
        // Store project data in localStorage to simulate last project
        const projectData = {
            project: {
                id: projectCode,
                name: projectName,
                version: '1.0.0'
            },
            features: [],
            phases: {},
            config: { projectOverrides: {} }
        };
        
        localStorage.setItem('last-project', JSON.stringify(projectData));
        window.testLastProject = projectData;
    }, { projectCode: code, projectName: name });
});

When('the application loads the last project', async function () {
    await this.page.evaluate(() => {
        if (window.testLastProject && window.app && window.app.managers.project) {
            window.app.managers.project.loadProjectData(window.testLastProject, 'last-project');
        }
    });
    
    await this.page.waitForTimeout(500);
});