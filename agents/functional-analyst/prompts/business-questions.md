# Business Requirements Discovery Questions

## Initial Discovery Questions

### Business Context
1. **Problem Statement**: What business problem does this feature solve?
2. **User Base**: Who are the primary users of this feature?
3. **Business Value**: What value will this feature provide to users and the business?
4. **Success Metrics**: How will you measure the success of this feature?
5. **Priority**: Why is this feature important now? What's the business urgency?

### User Workflows
6. **Main Workflow**: What are the main steps users will follow?
7. **Entry Points**: How do users access this feature?
8. **Data Inputs**: What information do users need to provide?
9. **Expected Outputs**: What results or outputs should users get?
10. **Workflow Variations**: Are there different paths users might take?

### Business Rules and Validation
11. **Business Rules**: What business rules govern this feature?
12. **Validation Requirements**: What data validation is required?
13. **Constraints**: Are there any business constraints or limitations?
14. **Permissions**: Who can use this feature? Any access restrictions?

### Integration and Dependencies
15. **System Integration**: How does this integrate with existing features?
16. **Data Dependencies**: What existing data does this feature need?
17. **External Systems**: Any external system integrations required?
18. **Configuration**: What configuration options are needed?

### Error Handling and Edge Cases
19. **Error Scenarios**: What can go wrong in the user workflow?
20. **Error Recovery**: How should users recover from errors?
21. **Edge Cases**: What unusual scenarios need to be handled?
22. **Fallback Behavior**: What happens when systems are unavailable?

### Performance and Scalability
23. **Performance Requirements**: Any specific performance needs?
24. **Data Volume**: How much data will this feature handle?
25. **Concurrent Users**: How many users might use this simultaneously?

## Follow-up Questions (Based on Initial Responses)

### For Project Management Features
- How does this relate to project phases and estimation workflows?
- What calculation dependencies exist with existing features?
- How should this integrate with the hierarchical configuration system?

### For Feature Management
- How does this relate to the existing CRUD operations?
- What validation rules should apply to feature data?
- How should this integrate with project phase calculations?

### For Configuration Features
- How does this fit into the global → project → local hierarchy?
- What migration scenarios need to be supported?
- How should defaults and overrides work?

### For Data Features
- What export formats should be supported?
- How should data validation and integrity be maintained?
- What persistence requirements exist?

### For UI Features
- How should this integrate with the existing modal system?
- What VSCode-style interface elements are needed?
- How should this work with the navigation system?

## Validation Questions

Before finalizing requirements:

1. **Completeness**: Have we covered all aspects of the feature?
2. **Clarity**: Are all requirements clear and unambiguous?
3. **Testability**: Can all requirements be validated through testing?
4. **Feasibility**: Are all requirements technically feasible?
5. **Business Alignment**: Do requirements align with business goals?

## Question Adaptation Guidelines

### For Simple Features
Focus on:
- Core workflow (questions 6-10)
- Basic validation (questions 11-13)
- Integration points (questions 15-17)

### For Complex Features
Include all sections with emphasis on:
- Detailed workflow analysis
- Comprehensive error handling
- Performance considerations
- Integration complexity

### For Configuration Features
Special focus on:
- Hierarchy and inheritance
- Migration scenarios
- Default behaviors
- Override mechanisms

### For Calculation Features
Special focus on:
- Business rules and formulas
- Data dependencies
- Validation requirements
- Real-time update needs