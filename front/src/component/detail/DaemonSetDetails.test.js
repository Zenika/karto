import DaemonSetDetails from './DaemonSetDetails';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

describe('DaemonSetDetails component', () => {

    it('displays details about daemonSet and its target pods', () => {
        const daemonSetData = {
            namespace: 'ns',
            name: 'ds',
            targetPods: [
                { namespace: 'ns1', name: 'pod1' },
                { namespace: 'ns2', name: 'pod2' }
            ]
        };
        render(<DaemonSetDetails data={daemonSetData}/>);

        expect(screen.queryByText('DaemonSet details')).toBeInTheDocument();
        expect(screen.queryByText('Namespace:')).toBeInTheDocument();
        expect(screen.queryByText('ns')).toBeInTheDocument();
        expect(screen.queryByText('Name:')).toBeInTheDocument();
        expect(screen.queryByText('ds')).toBeInTheDocument();
        expect(screen.queryByText('Target pods:')).toBeInTheDocument();
        expect(screen.queryByText('ns1/pod1')).toBeInTheDocument();
        expect(screen.queryByText('ns2/pod2')).toBeInTheDocument();
    });
});
