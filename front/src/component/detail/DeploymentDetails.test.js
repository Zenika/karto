import DeploymentDetails from './DeploymentDetails';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

describe('DeploymentDetails component', () => {

    it('displays details about replicaSet and its target replicaSets', () => {
        const replicaSetData = {
            namespace: 'ns',
            name: 'deploy',
            targetReplicaSets: [
                { namespace: 'ns1', name: 'rs1' },
                { namespace: 'ns2', name: 'rs2' }
            ]
        };
        render(<DeploymentDetails data={replicaSetData}/>);

        expect(screen.queryByText('Deployment details')).toBeInTheDocument();
        expect(screen.queryByText('Namespace:')).toBeInTheDocument();
        expect(screen.queryByText('ns')).toBeInTheDocument();
        expect(screen.queryByText('Name:')).toBeInTheDocument();
        expect(screen.queryByText('deploy')).toBeInTheDocument();
        expect(screen.queryByText('Target replicaSets:')).toBeInTheDocument();
        expect(screen.queryByText('ns1/rs1')).toBeInTheDocument();
        expect(screen.queryByText('ns2/rs2')).toBeInTheDocument();
    });
});
