import React from 'react';
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
            isEgressIsolated: true
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
            isIngressIsolated: false
        };
        render(<PodDetails data={podData}/>);

        expect(screen.queryByText('Isolated for egress')).not.toBeInTheDocument();
    });
});
