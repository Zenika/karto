export const labelSelectorOperators = [
    { op: 'eq', label: '=', args: 'single' },
    { op: 'neq', label: '!=', args: 'single' },
    { op: 'in', label: 'in', args: 'multiple' },
    { op: 'notin', label: 'not in', args: 'multiple' },
    { op: 'exists', label: 'exists', args: 'none' },
    { op: 'notexists', label: 'not exists', args: 'none' }
];

export const maxRecommendedPods = 100;
export const maxRecommendedAllowedRoutes = 1000;
