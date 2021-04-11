import PodDetails from './PodDetails';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

describe('PodDetails component', () => {
    it('displays details about pod', () => {
        const podData = {
            namespace: 'ns',
            name: 'pod',
            labels: {
                k1: 'v1'
            },
            isIngressIsolated: false,
            isEgressIsolated: true,
            containers: 4,
            containersRunning: 3,
            containersReady: 2,
            containersWithoutRestart: 1
        };
        render(<PodDetails data={podData}/>);

        expect(screen.queryByText('Pod details')).toBeInTheDocument();
        expect(screen.queryByText('Namespace:')).toBeInTheDocument();
        expect(screen.queryByText('ns')).toBeInTheDocument();
        expect(screen.queryByText('Name:')).toBeInTheDocument();
        expect(screen.queryByText('pod')).toBeInTheDocument();
        expect(screen.queryByText('Labels:')).toBeInTheDocument();
        expect(screen.queryByText('k1:')).toBeInTheDocument();
        expect(screen.queryByText('v1')).toBeInTheDocument();
        expect(screen.queryByText('Isolated for ingress:')).toBeInTheDocument();
        expect(screen.queryByText('no')).toBeInTheDocument();
        expect(screen.queryByText('Isolated for egress:')).toBeInTheDocument();
        expect(screen.queryByText('yes')).toBeInTheDocument();
        expect(screen.queryByText('Health:')).toBeInTheDocument();
        expect(screen.queryByText('Containers running:')).toBeInTheDocument();
        expect(screen.queryByText('3/4')).toBeInTheDocument();
        expect(screen.queryByText('Containers ready:')).toBeInTheDocument();
        expect(screen.queryByText('2/4')).toBeInTheDocument();
        expect(screen.queryByText('Containers with no restart:')).toBeInTheDocument();
        expect(screen.queryByText('1/4')).toBeInTheDocument();
    });

    it('does not display ingress info when not specified', () => {
        const podData = {
            namespace: 'ns',
            name: 'pod',
            labels: {},
            isEgressIsolated: false
        };
        render(<PodDetails data={podData}/>);

        expect(screen.queryByText('Isolated for ingress')).not.toBeInTheDocument();
    });

    it('does not display egress info when not specified', () => {
        const podData = {
            namespace: 'ns',
            name: 'pod',
            labels: {},
            isIngressIsolated: true
        };
        render(<PodDetails data={podData}/>);

        expect(screen.queryByText('Isolated for egress')).not.toBeInTheDocument();
    });

    it('does not display health info when not specified', () => {
        const podData = {
            namespace: 'ns',
            name: 'pod',
            labels: {},
            isIngressIsolated: true
        };
        render(<PodDetails data={podData}/>);

        expect(screen.queryByText('Health:')).not.toBeInTheDocument();
        expect(screen.queryByText('Containers:')).not.toBeInTheDocument();
        expect(screen.queryByText('Running:')).not.toBeInTheDocument();
        expect(screen.queryByText('Ready')).not.toBeInTheDocument();
        expect(screen.queryByText('With no restarts:')).not.toBeInTheDocument();
    });
});
