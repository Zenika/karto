import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import IngressDetails from './IngressDetails';

describe('IngressDetails component', () => {

    it('displays details about ingress and its target services', () => {
        const ingressData = {
            namespace: 'ns',
            name: 'ingress',
            targetServices: [
                { namespace: 'ns1', name: 'svc1' },
                { namespace: 'ns2', name: 'svc2' }
            ]
        };
        render(<IngressDetails data={ingressData}/>);

        expect(screen.queryByText('Ingress details')).toBeInTheDocument();
        expect(screen.queryByText('Namespace:')).toBeInTheDocument();
        expect(screen.queryByText('ns')).toBeInTheDocument();
        expect(screen.queryByText('Name:')).toBeInTheDocument();
        expect(screen.queryByText('ingress')).toBeInTheDocument();
        expect(screen.queryByText('Target services:')).toBeInTheDocument();
        expect(screen.queryByText('ns1/svc1')).toBeInTheDocument();
        expect(screen.queryByText('ns2/svc2')).toBeInTheDocument();
    });
});
