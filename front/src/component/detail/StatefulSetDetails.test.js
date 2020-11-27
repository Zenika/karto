import StatefulSetDetails from './StatefulSetDetails';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

describe('StatefulSetDetails component', () => {

    it('displays details about statefulSet and its target pods', () => {
        const statefulSetData = {
            namespace: 'ns',
            name: 'ss',
            targetPods: [
                { namespace: 'ns1', name: 'pod1' },
                { namespace: 'ns2', name: 'pod2' }
            ]
        };
        render(<StatefulSetDetails data={statefulSetData}/>);

        expect(screen.queryByText('StatefulSet details')).toBeInTheDocument();
        expect(screen.queryByText('Namespace:')).toBeInTheDocument();
        expect(screen.queryByText('ns')).toBeInTheDocument();
        expect(screen.queryByText('Name:')).toBeInTheDocument();
        expect(screen.queryByText('ss')).toBeInTheDocument();
        expect(screen.queryByText('Target pods:')).toBeInTheDocument();
        expect(screen.queryByText('ns1/pod1')).toBeInTheDocument();
        expect(screen.queryByText('ns2/pod2')).toBeInTheDocument();
    });
});
