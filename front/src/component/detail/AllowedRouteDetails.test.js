import React from 'react';
import AllowedRouteDetails from './AllowedRouteDetails';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

describe('AllowedRouteDetails component', () => {

    it('displays details about allowedRoute', () => {
        const allowedRouteData = {
            sourcePod: { namespace: 'ns1', name: 'pod1', isEgressIsolated: true },
            egressPolicies: [{ namespace: 'eg1-ns', name: 'eg1' }, { namespace: 'eg2-ns', name: 'eg2' }],
            targetPod: { namespace: 'ns2', name: 'pod2', isIngressIsolated: true },
            ingressPolicies: [{ namespace: 'in1-ns', name: 'in1' }, { namespace: 'in2-ns', name: 'in2' }],
            ports: [80, 443]
        };
        render(<AllowedRouteDetails data={allowedRouteData}/>);

        expect(screen.queryByText('Allowed route details')).toBeInTheDocument();
        expect(screen.queryByText('Source pod:')).toBeInTheDocument();
        expect(screen.queryByText('ns1/pod1')).toBeInTheDocument();
        expect(screen.queryByText('Target pod:')).toBeInTheDocument();
        expect(screen.queryByText('ns2/pod2')).toBeInTheDocument();
        expect(screen.queryByText('Ports:')).toBeInTheDocument();
        expect(screen.queryByText('80, 443')).toBeInTheDocument();
        expect(screen.queryByText('Explanation:')).toBeInTheDocument();
        expect(screen.queryByText('Policies allowing egress from source:')).toBeInTheDocument();
        expect(screen.queryByText('eg1-ns/eg1, eg2-ns/eg2')).toBeInTheDocument();
        expect(screen.queryByText('Policies allowing ingress to target:')).toBeInTheDocument();
        expect(screen.queryByText('in1-ns/in1, in2-ns/in2')).toBeInTheDocument();
    });

    it('displays special label for ports when all are allowed', () => {
        const allowedRouteData = {
            sourcePod: { namespace: 'ns1', name: 'pod1', isEgressIsolated: true },
            egressPolicies: [],
            targetPod: { namespace: 'ns2', name: 'pod2', isIngressIsolated: true },
            ingressPolicies: [],
            ports: null
        };
        render(<AllowedRouteDetails data={allowedRouteData}/>);

        expect(screen.queryByText('Ports:')).toBeInTheDocument();
        expect(screen.queryByText('all')).toBeInTheDocument();
    });

    it('displays special label as reason when no egress isolation', () => {
        const allowedRouteData = {
            sourcePod: { namespace: 'ns1', name: 'pod1', isEgressIsolated: false },
            egressPolicies: [],
            targetPod: { namespace: 'ns2', name: 'pod2', isIngressIsolated: true },
            ingressPolicies: [{ namespace: 'in1-ns', name: 'in1' }, { namespace: 'in2-ns', name: 'in2' }],
            ports: null
        };
        render(<AllowedRouteDetails data={allowedRouteData}/>);

        expect(screen.queryByText('Explanation:')).toBeInTheDocument();
        expect(screen.queryByText('Policies allowing egress from source:')).toBeInTheDocument();
        expect(screen.queryByText('no isolation')).toBeInTheDocument();
    });

    it('displays special label as reason when no ingress isolation', () => {
        const allowedRouteData = {
            sourcePod: { namespace: 'ns1', name: 'pod1', isEgressIsolated: true },
            egressPolicies: [{ namespace: 'eg1-ns', name: 'eg1' }, { namespace: 'eg2-ns', name: 'eg2' }],
            targetPod: { namespace: 'ns2', name: 'pod2', isIngressIsolated: false },
            ingressPolicies: [],
            ports: null
        };
        render(<AllowedRouteDetails data={allowedRouteData}/>);

        expect(screen.queryByText('Explanation:')).toBeInTheDocument();
        expect(screen.queryByText('Policies allowing ingress to target:')).toBeInTheDocument();
        expect(screen.queryByText('no isolation')).toBeInTheDocument();
    });
});
