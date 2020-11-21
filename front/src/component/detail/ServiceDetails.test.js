import ServiceDetails from './ServiceDetails';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

describe('ServiceDetails component', () => {

    it('displays details about service and its target pods', () => {
        const serviceData = {
            namespace: 'ns',
            name: 'svc',
            targetPods: [
                { namespace: 'ns1', name: 'pod1' },
                { namespace: 'ns2', name: 'pod2' }
            ]
        };
        render(<ServiceDetails data={serviceData}/>);

        expect(screen.queryByText('Service details')).toBeInTheDocument();
        expect(screen.queryByText('Namespace:')).toBeInTheDocument();
        expect(screen.queryByText('ns')).toBeInTheDocument();
        expect(screen.queryByText('Name:')).toBeInTheDocument();
        expect(screen.queryByText('svc')).toBeInTheDocument();
        expect(screen.queryByText('Target pods:')).toBeInTheDocument();
        expect(screen.queryByText('ns1/pod1')).toBeInTheDocument();
        expect(screen.queryByText('ns2/pod2')).toBeInTheDocument();
    });
});
