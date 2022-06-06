package traffic

import (
	"github.com/google/go-cmp/cmp"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	"karto/analyzer/shared"
	"karto/analyzer/traffic/allowedroute"
	"karto/analyzer/traffic/podisolation"
	"karto/testutils"
	"karto/types"
	"reflect"
	"testing"
)

func TestAnalyze(t *testing.T) {
	type args struct {
		clusterState ClusterState
	}
	type mocks struct {
		podIsolation []mockPodIsolationAnalyzerCall
		allowedRoute []mockAllowedRouteAnalyzerCall
	}
	k8sNamespace := testutils.NewNamespaceBuilder().WithName("ns").Build()
	k8sPod1 := testutils.NewPodBuilder().WithName("pod1").WithNamespace("ns").Build()
	k8sPod2 := testutils.NewPodBuilder().WithName("pod2").WithNamespace("ns").Build()
	k8sNetworkPolicy1 := testutils.NewNetworkPolicyBuilder().WithName("netPol1").WithNamespace("ns1").
		WithLabel("k", "v1").Build()
	k8sNetworkPolicy2 := testutils.NewNetworkPolicyBuilder().WithName("netPol2").WithNamespace("ns2").
		WithLabel("k", "v2").Build()
	podIsolation1 := &shared.PodIsolation{
		Pod:             k8sPod1,
		IngressPolicies: []*networkingv1.NetworkPolicy{},
		EgressPolicies:  []*networkingv1.NetworkPolicy{},
	}
	podIsolation2 := &shared.PodIsolation{
		Pod:             k8sPod2,
		IngressPolicies: []*networkingv1.NetworkPolicy{},
		EgressPolicies:  []*networkingv1.NetworkPolicy{},
	}
	podRef1 := types.PodRef{Name: "pod1", Namespace: "ns"}
	podRef2 := types.PodRef{Name: "pod2", Namespace: "ns"}
	allowedRoute := &types.AllowedRoute{
		SourcePod: podRef1,
		EgressPolicies: []types.NetworkPolicy{
			{Name: k8sNetworkPolicy1.Name, Namespace: k8sNetworkPolicy1.Namespace, Labels: k8sNetworkPolicy1.Labels},
		},
		TargetPod: podRef2,
		IngressPolicies: []types.NetworkPolicy{
			{Name: k8sNetworkPolicy2.Name, Namespace: k8sNetworkPolicy2.Namespace, Labels: k8sNetworkPolicy2.Labels},
		},
		Ports: []int32{80, 443},
	}
	tests := []struct {
		name                   string
		mocks                  mocks
		args                   args
		expectedAnalysisResult AnalysisResult
	}{
		{
			name: "delegates to pod isolation and allowed route analyzers",
			mocks: mocks{
				podIsolation: []mockPodIsolationAnalyzerCall{
					{
						args: mockPodIsolationAnalyzerCallArgs{pod: k8sPod1,
							networkPolicies: []*networkingv1.NetworkPolicy{k8sNetworkPolicy1, k8sNetworkPolicy2}},
						returnValue: podIsolation1,
					},
					{
						args: mockPodIsolationAnalyzerCallArgs{pod: k8sPod2,
							networkPolicies: []*networkingv1.NetworkPolicy{k8sNetworkPolicy1, k8sNetworkPolicy2}},
						returnValue: podIsolation2,
					},
				},
				allowedRoute: []mockAllowedRouteAnalyzerCall{
					{
						args: mockAllowedRouteAnalyzerCallArgs{
							sourcePodIsolation: podIsolation1,
							targetPodIsolation: podIsolation2,
							namespaces:         []*corev1.Namespace{k8sNamespace},
						},
						returnValue: allowedRoute,
					},
					{
						args: mockAllowedRouteAnalyzerCallArgs{
							sourcePodIsolation: podIsolation2,
							targetPodIsolation: podIsolation1,
							namespaces:         []*corev1.Namespace{k8sNamespace},
						},
						returnValue: nil,
					},
				},
			},
			args: args{
				clusterState: ClusterState{
					Pods:            []*corev1.Pod{k8sPod1, k8sPod2},
					NetworkPolicies: []*networkingv1.NetworkPolicy{k8sNetworkPolicy1, k8sNetworkPolicy2},
					Namespaces:      []*corev1.Namespace{k8sNamespace},
				},
			},
			expectedAnalysisResult: AnalysisResult{
				Pods: []*types.PodIsolation{
					{Pod: podRef1, IsIngressIsolated: false, IsEgressIsolated: false},
					{Pod: podRef2, IsIngressIsolated: false, IsEgressIsolated: false},
				},
				AllowedRoutes: []*types.AllowedRoute{allowedRoute},
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			podIsolationAnalyzer := createMockPodIsolationAnalyzer(t, tt.mocks.podIsolation)
			allowedRouteAnalyzer := createMockAllowedRouteAnalyzer(t, tt.mocks.allowedRoute)
			analyzer := NewAnalyzer(podIsolationAnalyzer, allowedRouteAnalyzer)
			analysisResult := analyzer.Analyze(tt.args.clusterState)
			if diff := cmp.Diff(tt.expectedAnalysisResult, analysisResult); diff != "" {
				t.Errorf("Analyze() result mismatch (-want +got):\n%s", diff)
			}
		})
	}
}

type mockPodIsolationAnalyzerCallArgs struct {
	pod             *corev1.Pod
	networkPolicies []*networkingv1.NetworkPolicy
}

type mockPodIsolationAnalyzerCall struct {
	args        mockPodIsolationAnalyzerCallArgs
	returnValue *shared.PodIsolation
}

type mockPodIsolationAnalyzer struct {
	t     *testing.T
	calls []mockPodIsolationAnalyzerCall
}

func (mock mockPodIsolationAnalyzer) Analyze(pod *corev1.Pod,
	networkPolicies []*networkingv1.NetworkPolicy) *shared.PodIsolation {
	for _, call := range mock.calls {
		if reflect.DeepEqual(call.args.pod, pod) &&
			reflect.DeepEqual(call.args.networkPolicies, networkPolicies) {
			return call.returnValue
		}
	}
	mock.t.Fatalf("mockPodIsolationAnalyzer was called with unexpected arguments: \n\tpod: %s\n"+
		"\tnetworkPolicies: %s\n", pod, networkPolicies)
	return nil
}

func createMockPodIsolationAnalyzer(t *testing.T, calls []mockPodIsolationAnalyzerCall) podisolation.Analyzer {
	return mockPodIsolationAnalyzer{
		t:     t,
		calls: calls,
	}
}

type mockAllowedRouteAnalyzerCallArgs struct {
	sourcePodIsolation *shared.PodIsolation
	targetPodIsolation *shared.PodIsolation
	namespaces         []*corev1.Namespace
}

type mockAllowedRouteAnalyzerCall struct {
	args        mockAllowedRouteAnalyzerCallArgs
	returnValue *types.AllowedRoute
}

type mockAllowedRouteAnalyzer struct {
	t     *testing.T
	calls []mockAllowedRouteAnalyzerCall
}

func (mock mockAllowedRouteAnalyzer) Analyze(sourcePodIsolation *shared.PodIsolation,
	targetPodIsolation *shared.PodIsolation, namespaces []*corev1.Namespace) *types.AllowedRoute {
	for _, call := range mock.calls {
		if reflect.DeepEqual(call.args.sourcePodIsolation, sourcePodIsolation) &&
			reflect.DeepEqual(call.args.targetPodIsolation, targetPodIsolation) &&
			reflect.DeepEqual(call.args.namespaces, namespaces) {
			return call.returnValue
		}
	}
	mock.t.Fatalf("mockAllowedRouteAnalyzer was called with unexpected arguments: \n"+
		"\tsourcePodIsolation: %s\n\ttargetPodIsolation: %s\n\tnamespaces: %s\n", sourcePodIsolation,
		targetPodIsolation, namespaces)
	return nil
}

func createMockAllowedRouteAnalyzer(t *testing.T, calls []mockAllowedRouteAnalyzerCall) allowedroute.Analyzer {
	return mockAllowedRouteAnalyzer{
		t:     t,
		calls: calls,
	}
}
