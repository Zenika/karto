package podisolation

import (
	"github.com/google/go-cmp/cmp"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	"karto/analyzer/traffic/shared"
	"karto/testutils"
	"testing"
)

func Test_Analyze(t *testing.T) {
	type args struct {
		pod             *corev1.Pod
		networkPolicies []*networkingv1.NetworkPolicy
	}
	tests := []struct {
		name                 string
		args                 args
		expectedPodIsolation *shared.PodIsolation
	}{
		{
			name: "a pod is not isolated by default",
			args: args{
				pod:             testutils.NewPodBuilder().WithName("Pod1").Build(),
				networkPolicies: []*networkingv1.NetworkPolicy{},
			},
			expectedPodIsolation: &shared.PodIsolation{
				Pod:             testutils.NewPodBuilder().WithName("Pod1").Build(),
				IngressPolicies: []*networkingv1.NetworkPolicy{},
				EgressPolicies:  []*networkingv1.NetworkPolicy{},
			},
		},
		{
			name: "a pod is isolated when a network policy matches its labels",
			args: args{
				pod: testutils.NewPodBuilder().WithName("Pod1").WithLabel("app", "foo").Build(),
				networkPolicies: []*networkingv1.NetworkPolicy{
					testutils.NewNetworkPolicyBuilder().WithTypes("Ingress", "Egress").WithPodSelector(testutils.NewLabelSelectorBuilder().WithMatchLabel("app", "foo").Build()).Build(),
				},
			},
			expectedPodIsolation: &shared.PodIsolation{
				Pod: testutils.NewPodBuilder().WithName("Pod1").WithLabel("app", "foo").Build(),
				IngressPolicies: []*networkingv1.NetworkPolicy{
					testutils.NewNetworkPolicyBuilder().WithTypes("Ingress", "Egress").WithPodSelector(testutils.NewLabelSelectorBuilder().WithMatchLabel("app", "foo").Build()).Build(),
				},
				EgressPolicies: []*networkingv1.NetworkPolicy{
					testutils.NewNetworkPolicyBuilder().WithTypes("Ingress", "Egress").WithPodSelector(testutils.NewLabelSelectorBuilder().WithMatchLabel("app", "foo").Build()).Build(),
				},
			},
		},
		{
			name: "a pod is not isolated if no network policy matches its labels",
			args: args{
				pod: testutils.NewPodBuilder().WithName("Pod1").WithLabel("app", "foo").Build(),
				networkPolicies: []*networkingv1.NetworkPolicy{
					testutils.NewNetworkPolicyBuilder().WithTypes("Ingress", "Egress").WithPodSelector(testutils.NewLabelSelectorBuilder().WithMatchLabel("app", "bar").Build()).Build(),
				},
			},
			expectedPodIsolation: &shared.PodIsolation{
				Pod:             testutils.NewPodBuilder().WithName("Pod1").WithLabel("app", "foo").Build(),
				IngressPolicies: []*networkingv1.NetworkPolicy{},
				EgressPolicies:  []*networkingv1.NetworkPolicy{},
			},
		},
		{
			name: "a network policy with empty selector matches all pods",
			args: args{
				pod: testutils.NewPodBuilder().WithName("Pod1").WithLabel("app", "foo").Build(),
				networkPolicies: []*networkingv1.NetworkPolicy{
					testutils.NewNetworkPolicyBuilder().WithTypes("Ingress", "Egress").WithPodSelector(testutils.NewLabelSelectorBuilder().Build()).Build(),
				},
			},
			expectedPodIsolation: &shared.PodIsolation{
				Pod: testutils.NewPodBuilder().WithName("Pod1").WithLabel("app", "foo").Build(),
				IngressPolicies: []*networkingv1.NetworkPolicy{
					testutils.NewNetworkPolicyBuilder().WithTypes("Ingress", "Egress").WithPodSelector(testutils.NewLabelSelectorBuilder().Build()).Build(),
				},
				EgressPolicies: []*networkingv1.NetworkPolicy{
					testutils.NewNetworkPolicyBuilder().WithTypes("Ingress", "Egress").WithPodSelector(testutils.NewLabelSelectorBuilder().Build()).Build(),
				},
			},
		},
		{
			name: "a pod is not isolated by a network policy from another namespace",
			args: args{
				pod: testutils.NewPodBuilder().WithName("Pod1").WithNamespace("ns").Build(),
				networkPolicies: []*networkingv1.NetworkPolicy{
					testutils.NewNetworkPolicyBuilder().WithTypes("Ingress", "Egress").WithNamespace("other").Build(),
				},
			},
			expectedPodIsolation: &shared.PodIsolation{
				Pod:             testutils.NewPodBuilder().WithName("Pod1").WithNamespace("ns").Build(),
				IngressPolicies: []*networkingv1.NetworkPolicy{},
				EgressPolicies:  []*networkingv1.NetworkPolicy{},
			},
		},
		{
			name: "a pod can be isolated for ingress and not isolated for egress",
			args: args{
				pod: testutils.NewPodBuilder().WithName("Pod1").Build(),
				networkPolicies: []*networkingv1.NetworkPolicy{
					testutils.NewNetworkPolicyBuilder().WithTypes("Ingress").WithPodSelector(testutils.NewLabelSelectorBuilder().Build()).Build(),
				},
			},
			expectedPodIsolation: &shared.PodIsolation{
				Pod: testutils.NewPodBuilder().WithName("Pod1").Build(),
				IngressPolicies: []*networkingv1.NetworkPolicy{
					testutils.NewNetworkPolicyBuilder().WithTypes("Ingress").WithPodSelector(testutils.NewLabelSelectorBuilder().Build()).Build(),
				},
				EgressPolicies: []*networkingv1.NetworkPolicy{},
			},
		},
		{
			name: "a pod can be isolated for egress and not isolated for ingress",
			args: args{
				pod: testutils.NewPodBuilder().WithName("Pod1").Build(),
				networkPolicies: []*networkingv1.NetworkPolicy{
					testutils.NewNetworkPolicyBuilder().WithTypes("Egress").WithPodSelector(testutils.NewLabelSelectorBuilder().Build()).Build(),
				},
			},
			expectedPodIsolation: &shared.PodIsolation{
				Pod:             testutils.NewPodBuilder().WithName("Pod1").Build(),
				IngressPolicies: []*networkingv1.NetworkPolicy{},
				EgressPolicies: []*networkingv1.NetworkPolicy{
					testutils.NewNetworkPolicyBuilder().WithTypes("Egress").WithPodSelector(testutils.NewLabelSelectorBuilder().Build()).Build(),
				},
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			analyzer := NewAnalyzer()
			podIsolation := analyzer.Analyze(tt.args.pod, tt.args.networkPolicies)
			if diff := cmp.Diff(tt.expectedPodIsolation, podIsolation); diff != "" {
				t.Errorf("Analyze() result mismatch (-want +got):\n%s", diff)
			}
		})
	}
}
