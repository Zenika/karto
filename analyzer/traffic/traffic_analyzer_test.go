package traffic

import (
	"fmt"
	"github.com/google/go-cmp/cmp"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	"karto/analyzer/traffic/allowedroute"
	"karto/analyzer/traffic/podisolation"
	"karto/analyzer/traffic/shared"
	"karto/testutils"
	"karto/types"
	"reflect"
	"testing"
)

func Test_Analyze(t *testing.T) {
	type args struct {
		pods            []*corev1.Pod
		networkPolicies []*networkingv1.NetworkPolicy
		namespaces      []*corev1.Namespace
	}
	type mocks struct {
		podIsolation []mockPodIsolationCall
		allowedRoute []mockAllowedRouteCall
	}
	namespace := testutils.NewNamespaceBuilder().WithName("ns").Build()
	pod1 := testutils.NewPodBuilder().WithName("pod1").WithNamespace("ns").Build()
	pod2 := testutils.NewPodBuilder().WithName("pod2").WithNamespace("ns").Build()
	podIsolation1 := shared.PodIsolation{
		Pod:             pod1,
		IngressPolicies: []*networkingv1.NetworkPolicy{},
		EgressPolicies:  []*networkingv1.NetworkPolicy{},
	}
	podIsolation2 := shared.PodIsolation{
		Pod:             pod2,
		IngressPolicies: []*networkingv1.NetworkPolicy{},
		EgressPolicies:  []*networkingv1.NetworkPolicy{},
	}
	podRef1 := types.PodRef{Name: "pod1", Namespace: "ns"}
	podRef2 := types.PodRef{Name: "pod2", Namespace: "ns"}
	networkPolicy1 := testutils.NewNetworkPolicyBuilder().WithName("netPol1").WithNamespace("ns1").WithLabel("k", "v1").Build()
	networkPolicy2 := testutils.NewNetworkPolicyBuilder().WithName("netPol2").WithNamespace("ns2").WithLabel("k", "v2").Build()
	var tests = []struct {
		name                  string
		mocks                 mocks
		args                  args
		expectedPodIsolations []types.PodIsolation
		expectedAllowedRoutes []types.AllowedRoute
	}{
		{
			name: "should delegate to pod isolation and allowed route analyzers",
			mocks: mocks{
				podIsolation: []mockPodIsolationCall{
					{
						args:        mockPodIsolationCallArgs{pod: pod1, networkPolicies: []*networkingv1.NetworkPolicy{networkPolicy1, networkPolicy2}},
						returnValue: podIsolation1,
					},
					{
						args:        mockPodIsolationCallArgs{pod: pod2, networkPolicies: []*networkingv1.NetworkPolicy{networkPolicy1, networkPolicy2}},
						returnValue: podIsolation2,
					},
				},
				allowedRoute: []mockAllowedRouteCall{
					{
						args: mockAllowedRouteCallArgs{
							sourcePodIsolation: podIsolation1,
							targetPodIsolation: podIsolation2,
							namespaces:         []*corev1.Namespace{namespace},
						},
						returnValue: &types.AllowedRoute{
							SourcePod: podRef1,
							EgressPolicies: []types.NetworkPolicy{
								{Name: networkPolicy1.Name, Namespace: networkPolicy1.Namespace, Labels: networkPolicy1.Labels},
							},
							TargetPod: podRef2,
							IngressPolicies: []types.NetworkPolicy{
								{Name: networkPolicy2.Name, Namespace: networkPolicy2.Namespace, Labels: networkPolicy2.Labels},
							},
							Ports: []int32{80, 443},
						},
					},
					{
						args: mockAllowedRouteCallArgs{
							sourcePodIsolation: podIsolation2,
							targetPodIsolation: podIsolation1,
							namespaces:         []*corev1.Namespace{namespace},
						},
						returnValue: nil,
					},
				},
			},
			args: args{
				pods:            []*corev1.Pod{pod1, pod2},
				networkPolicies: []*networkingv1.NetworkPolicy{networkPolicy1, networkPolicy2},
				namespaces:      []*corev1.Namespace{namespace},
			},
			expectedPodIsolations: []types.PodIsolation{
				{Pod: podRef1, IsIngressIsolated: false, IsEgressIsolated: false},
				{Pod: podRef2, IsIngressIsolated: false, IsEgressIsolated: false},
			},
			expectedAllowedRoutes: []types.AllowedRoute{
				{
					SourcePod: podRef1,
					EgressPolicies: []types.NetworkPolicy{
						{Name: networkPolicy1.Name, Namespace: networkPolicy1.Namespace, Labels: networkPolicy1.Labels},
					},
					TargetPod: podRef2,
					IngressPolicies: []types.NetworkPolicy{
						{Name: networkPolicy2.Name, Namespace: networkPolicy2.Namespace, Labels: networkPolicy2.Labels},
					},
					Ports: []int32{80, 443},
				},
			},
		},
	}
	for _, tt := range tests {
		podIsolationAnalyzer := createMockPodIsolationAnalyzer(t, tt.mocks.podIsolation)
		allowedRouteAnalyzer := createMockAllowedRouteAnalyzer(t, tt.mocks.allowedRoute)
		analyzer := analyzerImpl{
			podIsolationAnalyzer: podIsolationAnalyzer,
			allowedRouteAnalyzer: allowedRouteAnalyzer,
		}
		t.Run(tt.name, func(t *testing.T) {
			podIsolations, allowedRoutes := analyzer.Analyze(tt.args.pods, tt.args.namespaces, tt.args.networkPolicies)
			if diff := cmp.Diff(tt.expectedPodIsolations, podIsolations); diff != "" {
				t.Errorf("Analyze() pod isolations result mismatch (-want +got):\n%s", diff)
			}
			if diff := cmp.Diff(tt.expectedAllowedRoutes, allowedRoutes); diff != "" {
				t.Errorf("Analyze() allowed routes result mismatch (-want +got):\n%s", diff)
			}
		})
	}
}

type mockPodIsolationCallArgs struct {
	pod             *corev1.Pod
	networkPolicies []*networkingv1.NetworkPolicy
}

type mockPodIsolationCall struct {
	args        mockPodIsolationCallArgs
	returnValue shared.PodIsolation
}

type mockPodIsolationAnalyzer struct {
	t     *testing.T
	calls []mockPodIsolationCall
}

func (mock mockPodIsolationAnalyzer) Analyze(pod *corev1.Pod, networkPolicies []*networkingv1.NetworkPolicy) shared.PodIsolation {
	for _, call := range mock.calls {
		if reflect.DeepEqual(call.args.pod, pod) &&
			reflect.DeepEqual(call.args.networkPolicies, networkPolicies) {
			return call.returnValue
		}
	}
	fmt.Printf("mockPodIsolationAnalyzer was called with unexpected arguments: \n")
	fmt.Printf("\tpod:%s\n", pod)
	fmt.Printf("\tnetworkPolicies=%s\n", networkPolicies)
	mock.t.FailNow()
	panic("unreachable but required to compile")
}

func createMockPodIsolationAnalyzer(t *testing.T, calls []mockPodIsolationCall) podisolation.Analyzer {
	return mockPodIsolationAnalyzer{
		t:     t,
		calls: calls,
	}
}

type mockAllowedRouteCallArgs struct {
	sourcePodIsolation shared.PodIsolation
	targetPodIsolation shared.PodIsolation
	namespaces         []*corev1.Namespace
}

type mockAllowedRouteCall struct {
	args        mockAllowedRouteCallArgs
	returnValue *types.AllowedRoute
}

type mockAllowedRouteAnalyzer struct {
	t     *testing.T
	calls []mockAllowedRouteCall
}

func (mock mockAllowedRouteAnalyzer) Analyze(sourcePodIsolation shared.PodIsolation, targetPodIsolation shared.PodIsolation, namespaces []*corev1.Namespace) *types.AllowedRoute {
	for _, call := range mock.calls {
		if reflect.DeepEqual(call.args.sourcePodIsolation, sourcePodIsolation) &&
			reflect.DeepEqual(call.args.targetPodIsolation, targetPodIsolation) &&
			reflect.DeepEqual(call.args.namespaces, namespaces) {
			return call.returnValue
		}
	}
	fmt.Printf("mockAllowedRouteAnalyzer was called with unexpected arguments: \n")
	fmt.Printf("\tsourcePodIsolation:%s\n", sourcePodIsolation)
	fmt.Printf("\ttargetPodIsolation=%s\n", targetPodIsolation)
	fmt.Printf("\tnamespaces=%s\n", namespaces)
	mock.t.FailNow()
	panic("unreachable but required to compile")
}

func createMockAllowedRouteAnalyzer(t *testing.T, calls []mockAllowedRouteCall) allowedroute.Analyzer {
	return mockAllowedRouteAnalyzer{
		t:     t,
		calls: calls,
	}
}
