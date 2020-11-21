import ReplicaSetDetails from './ReplicaSetDetails';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

describe('ReplicaSetDetails component', () => {

    it('displays details about replicaSet and its target pods', () => {
        const replicaSetData = {
            namespace: 'ns',
            name: 'rs',
            targetPods: [
                { namespace: 'ns1', name: 'pod1' },
                { namespace: 'ns2', name: 'pod2' }
            ]
        };
        render(<ReplicaSetDetails data={replicaSetData}/>);

        expect(screen.queryByText('ReplicaSet details')).toBeInTheDocument();
        expect(screen.queryByText('Namespace:')).toBeInTheDocument();
        expect(screen.queryByText('ns')).toBeInTheDocument();
        expect(screen.queryByText('Name:')).toBeInTheDocument();
        expect(screen.queryByText('rs')).toBeInTheDocument();
        expect(screen.queryByText('Target pods:')).toBeInTheDocument();
        expect(screen.queryByText('ns1/pod1')).toBeInTheDocument();
        expect(screen.queryByText('ns2/pod2')).toBeInTheDocument();
    });
});
