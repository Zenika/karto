package trafficanalyzer

import (
	"github.com/google/go-cmp/cmp"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/intstr"
	"karto/types"
	"testing"
)

func Test_computePodIsolation(t *testing.T) {
	type args struct {
		pod             *corev1.Pod
		networkPolicies []*networkingv1.NetworkPolicy
	}
	tests := []struct {
		name                 string
		args                 args
		expectedPodIsolation podIsolation
	}{
		{
			name: "a pod is not isolated by default",
			args: args{
				pod:             podBuilder().name("Pod1").build(),
				networkPolicies: []*networkingv1.NetworkPolicy{},
			},
			expectedPodIsolation: podIsolation{
				Pod:             podBuilder().name("Pod1").build(),
				IngressPolicies: []*networkingv1.NetworkPolicy{},
				EgressPolicies:  []*networkingv1.NetworkPolicy{},
			},
		},
		{
			name: "a pod is isolated when a network policy matches its labels",
			args: args{
				pod: podBuilder().name("Pod1").label("app", "foo").build(),
				networkPolicies: []*networkingv1.NetworkPolicy{
					networkPolicyBuilder().types("Ingress", "Egress").podSelector(labelSelectorBuilder().matchLabel("app", "foo").build()).build(),
				},
			},
			expectedPodIsolation: podIsolation{
				Pod: podBuilder().name("Pod1").label("app", "foo").build(),
				IngressPolicies: []*networkingv1.NetworkPolicy{
					networkPolicyBuilder().types("Ingress", "Egress").podSelector(labelSelectorBuilder().matchLabel("app", "foo").build()).build(),
				},
				EgressPolicies: []*networkingv1.NetworkPolicy{
					networkPolicyBuilder().types("Ingress", "Egress").podSelector(labelSelectorBuilder().matchLabel("app", "foo").build()).build(),
				},
			},
		},
		{
			name: "a pod is not isolated if no network policy matches its labels",
			args: args{
				pod: podBuilder().name("Pod1").label("app", "foo").build(),
				networkPolicies: []*networkingv1.NetworkPolicy{
					networkPolicyBuilder().types("Ingress", "Egress").podSelector(labelSelectorBuilder().matchLabel("app", "bar").build()).build(),
				},
			},
			expectedPodIsolation: podIsolation{
				Pod:             podBuilder().name("Pod1").label("app", "foo").build(),
				IngressPolicies: []*networkingv1.NetworkPolicy{},
				EgressPolicies:  []*networkingv1.NetworkPolicy{},
			},
		},
		{
			name: "a network policy with empty selector matches all pods",
			args: args{
				pod: podBuilder().name("Pod1").label("app", "foo").build(),
				networkPolicies: []*networkingv1.NetworkPolicy{
					networkPolicyBuilder().types("Ingress", "Egress").podSelector(labelSelectorBuilder().build()).build(),
				},
			},
			expectedPodIsolation: podIsolation{
				Pod: podBuilder().name("Pod1").label("app", "foo").build(),
				IngressPolicies: []*networkingv1.NetworkPolicy{
					networkPolicyBuilder().types("Ingress", "Egress").podSelector(labelSelectorBuilder().build()).build(),
				},
				EgressPolicies: []*networkingv1.NetworkPolicy{
					networkPolicyBuilder().types("Ingress", "Egress").podSelector(labelSelectorBuilder().build()).build(),
				},
			},
		},
		{
			name: "a pod is not isolated by a network policy from another namespace",
			args: args{
				pod: podBuilder().name("Pod1").namespace("ns").build(),
				networkPolicies: []*networkingv1.NetworkPolicy{
					networkPolicyBuilder().types("Ingress", "Egress").namespace("other").build(),
				},
			},
			expectedPodIsolation: podIsolation{
				Pod:             podBuilder().name("Pod1").namespace("ns").build(),
				IngressPolicies: []*networkingv1.NetworkPolicy{},
				EgressPolicies:  []*networkingv1.NetworkPolicy{},
			},
		},
		{
			name: "a pod can be isolated for ingress and not isolated for egress",
			args: args{
				pod: podBuilder().name("Pod1").build(),
				networkPolicies: []*networkingv1.NetworkPolicy{
					networkPolicyBuilder().types("Ingress").podSelector(labelSelectorBuilder().build()).build(),
				},
			},
			expectedPodIsolation: podIsolation{
				Pod: podBuilder().name("Pod1").build(),
				IngressPolicies: []*networkingv1.NetworkPolicy{
					networkPolicyBuilder().types("Ingress").podSelector(labelSelectorBuilder().build()).build(),
				},
				EgressPolicies: []*networkingv1.NetworkPolicy{},
			},
		},
		{
			name: "a pod can be isolated for egress and not isolated for ingress",
			args: args{
				pod: podBuilder().name("Pod1").build(),
				networkPolicies: []*networkingv1.NetworkPolicy{
					networkPolicyBuilder().types("Egress").podSelector(labelSelectorBuilder().build()).build(),
				},
			},
			expectedPodIsolation: podIsolation{
				Pod:             podBuilder().name("Pod1").build(),
				IngressPolicies: []*networkingv1.NetworkPolicy{},
				EgressPolicies: []*networkingv1.NetworkPolicy{
					networkPolicyBuilder().types("Egress").podSelector(labelSelectorBuilder().build()).build(),
				},
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			podIsolation := computePodIsolation(tt.args.pod, tt.args.networkPolicies)
			if diff := cmp.Diff(tt.expectedPodIsolation, podIsolation); diff != "" {
				t.Errorf("computePodIsolation() result mismatch (-want +got):\n%s", diff)
			}
		})
	}
}

func Test_computeAllowedRoute(t *testing.T) {
	type args struct {
		sourcePodIsolation podIsolation
		targetPodIsolation podIsolation
		namespaces         []*corev1.Namespace
	}
	tests := []struct {
		name                 string
		args                 args
		expectedAllowedRoute *types.AllowedRoute
	}{
		{
			name: "a non isolated pod can send traffic to non isolated pod",
			args: args{
				sourcePodIsolation: podIsolation{
					Pod: podBuilder().name("Pod1").build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{
						networkPolicyBuilder().types("Ingress").podSelector(labelSelectorBuilder().build()).build(),
					},
					EgressPolicies: []*networkingv1.NetworkPolicy{},
				},
				targetPodIsolation: podIsolation{
					Pod:             podBuilder().name("Pod2").build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies: []*networkingv1.NetworkPolicy{
						networkPolicyBuilder().types("Egress").podSelector(labelSelectorBuilder().build()).build(),
					},
				},
				namespaces: []*corev1.Namespace{
					namespaceBuilder().name("default").build(),
				},
			},
			expectedAllowedRoute: &types.AllowedRoute{
				SourcePod:       types.PodWithIsolation{Name: "Pod1", Namespace: "default", Labels: map[string]string{}, IsIngressIsolated: true, IsEgressIsolated: false},
				EgressPolicies:  []types.NetworkPolicy{},
				TargetPod:       types.PodWithIsolation{Name: "Pod2", Namespace: "default", Labels: map[string]string{}, IsIngressIsolated: false, IsEgressIsolated: true},
				IngressPolicies: []types.NetworkPolicy{},
				Ports:           nil,
			},
		},
		{
			name: "a non isolated pod can send traffic to pod accepting its labels",
			args: args{
				sourcePodIsolation: podIsolation{
					Pod:             podBuilder().name("Pod1").label("app", "foo").build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies:  []*networkingv1.NetworkPolicy{},
				},
				targetPodIsolation: podIsolation{
					Pod: podBuilder().name("Pod2").build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{
						networkPolicyBuilder().name("np").types("Ingress").ingressRule(networkingv1.NetworkPolicyIngressRule{
							From: []networkingv1.NetworkPolicyPeer{
								{
									PodSelector: labelSelectorBuilder().matchLabel("app", "foo").build(),
								},
							},
						}).build(),
					},
					EgressPolicies: []*networkingv1.NetworkPolicy{},
				},
				namespaces: []*corev1.Namespace{
					namespaceBuilder().name("default").build(),
				},
			},
			expectedAllowedRoute: &types.AllowedRoute{
				SourcePod:      types.PodWithIsolation{Name: "Pod1", Namespace: "default", Labels: map[string]string{"app": "foo"}, IsIngressIsolated: false, IsEgressIsolated: false},
				EgressPolicies: []types.NetworkPolicy{},
				TargetPod:      types.PodWithIsolation{Name: "Pod2", Namespace: "default", Labels: map[string]string{}, IsIngressIsolated: true, IsEgressIsolated: false},
				IngressPolicies: []types.NetworkPolicy{
					{Name: "np", Namespace: "default", Labels: map[string]string{}},
				},
				Ports: nil,
			},
		},
		{
			name: "a non isolated pod cannot send traffic to pod rejecting its labels",
			args: args{
				sourcePodIsolation: podIsolation{
					Pod:             podBuilder().name("Pod1").label("app", "foo").build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies:  []*networkingv1.NetworkPolicy{},
				},
				targetPodIsolation: podIsolation{
					Pod: podBuilder().name("Pod2").build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{
						networkPolicyBuilder().name("np").types("Ingress").ingressRule(networkingv1.NetworkPolicyIngressRule{
							From: []networkingv1.NetworkPolicyPeer{
								{
									PodSelector: labelSelectorBuilder().matchLabel("app", "bar").build(),
								},
							},
						}).build(),
					},
					EgressPolicies: []*networkingv1.NetworkPolicy{},
				},
				namespaces: []*corev1.Namespace{
					namespaceBuilder().name("default").build(),
				},
			},
			expectedAllowedRoute: nil,
		},
		{
			name: "a non isolated pod can send traffic to pod accepting its namespace",
			args: args{
				sourcePodIsolation: podIsolation{
					Pod:             podBuilder().name("Pod1").namespace("ns").build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies:  []*networkingv1.NetworkPolicy{},
				},
				targetPodIsolation: podIsolation{
					Pod: podBuilder().name("Pod2").build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{
						networkPolicyBuilder().name("np").types("Ingress").ingressRule(networkingv1.NetworkPolicyIngressRule{
							From: []networkingv1.NetworkPolicyPeer{
								{
									NamespaceSelector: labelSelectorBuilder().matchLabel("name", "ns").build(),
								},
							},
						}).build(),
					},
					EgressPolicies: []*networkingv1.NetworkPolicy{},
				},
				namespaces: []*corev1.Namespace{
					namespaceBuilder().name("ns").label("name", "ns").build(),
				},
			},
			expectedAllowedRoute: &types.AllowedRoute{
				SourcePod:      types.PodWithIsolation{Name: "Pod1", Namespace: "ns", Labels: map[string]string{}, IsIngressIsolated: false, IsEgressIsolated: false},
				EgressPolicies: []types.NetworkPolicy{},
				TargetPod:      types.PodWithIsolation{Name: "Pod2", Namespace: "default", Labels: map[string]string{}, IsIngressIsolated: true, IsEgressIsolated: false},
				IngressPolicies: []types.NetworkPolicy{
					{Name: "np", Namespace: "default", Labels: map[string]string{}},
				},
				Ports: nil,
			},
		},
		{
			name: "a non isolated pod cannot send traffic to pod rejecting its namespace",
			args: args{
				sourcePodIsolation: podIsolation{
					Pod:             podBuilder().name("Pod1").namespace("ns").build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies:  []*networkingv1.NetworkPolicy{},
				},
				targetPodIsolation: podIsolation{
					Pod: podBuilder().name("Pod2").build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{
						networkPolicyBuilder().name("np").types("Ingress").ingressRule(networkingv1.NetworkPolicyIngressRule{
							From: []networkingv1.NetworkPolicyPeer{
								{
									NamespaceSelector: labelSelectorBuilder().matchLabel("name", "other").build(),
								},
							},
						}).build(),
					},
					EgressPolicies: []*networkingv1.NetworkPolicy{},
				},
				namespaces: []*corev1.Namespace{
					namespaceBuilder().name("ns").label("name", "ns").build(),
				},
			},
			expectedAllowedRoute: nil,
		},
		{
			name: "a non isolated pod can send traffic to pod accepting both its labels and namespace",
			args: args{
				sourcePodIsolation: podIsolation{
					Pod:             podBuilder().name("Pod1").namespace("ns").label("app", "foo").build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies:  []*networkingv1.NetworkPolicy{},
				},
				targetPodIsolation: podIsolation{
					Pod: podBuilder().name("Pod2").build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{
						networkPolicyBuilder().name("np").types("Ingress").ingressRule(networkingv1.NetworkPolicyIngressRule{
							From: []networkingv1.NetworkPolicyPeer{
								{
									NamespaceSelector: labelSelectorBuilder().matchLabel("name", "ns").build(),
									PodSelector:       labelSelectorBuilder().matchLabel("app", "foo").build(),
								},
							},
						}).build(),
					},
					EgressPolicies: []*networkingv1.NetworkPolicy{},
				},
				namespaces: []*corev1.Namespace{
					namespaceBuilder().name("ns").label("name", "ns").build(),
				},
			},
			expectedAllowedRoute: &types.AllowedRoute{
				SourcePod:      types.PodWithIsolation{Name: "Pod1", Namespace: "ns", Labels: map[string]string{"app": "foo"}, IsIngressIsolated: false, IsEgressIsolated: false},
				EgressPolicies: []types.NetworkPolicy{},
				TargetPod:      types.PodWithIsolation{Name: "Pod2", Namespace: "default", Labels: map[string]string{}, IsIngressIsolated: true, IsEgressIsolated: false},
				IngressPolicies: []types.NetworkPolicy{
					{Name: "np", Namespace: "default", Labels: map[string]string{}},
				},
				Ports: nil,
			},
		},
		{
			name: "a non isolated pod cannot send traffic to pod accepting its labels but not its namespace",
			args: args{
				sourcePodIsolation: podIsolation{
					Pod:             podBuilder().name("Pod1").namespace("ns").label("app", "foo").build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies:  []*networkingv1.NetworkPolicy{},
				},
				targetPodIsolation: podIsolation{
					Pod: podBuilder().name("Pod2").build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{
						networkPolicyBuilder().name("np").types("Ingress").ingressRule(networkingv1.NetworkPolicyIngressRule{
							From: []networkingv1.NetworkPolicyPeer{
								{
									NamespaceSelector: labelSelectorBuilder().matchLabel("name", "other").build(),
									PodSelector:       labelSelectorBuilder().matchLabel("app", "foo").build(),
								},
							},
						}).build(),
					},
					EgressPolicies: []*networkingv1.NetworkPolicy{},
				},
				namespaces: []*corev1.Namespace{
					namespaceBuilder().name("ns").label("name", "ns").build(),
				},
			},
			expectedAllowedRoute: nil,
		},
		{
			name: "a non isolated pod cannot send traffic to pod accepting its namespace but not its labels",
			args: args{
				sourcePodIsolation: podIsolation{
					Pod:             podBuilder().name("Pod1").namespace("ns").label("app", "foo").build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies:  []*networkingv1.NetworkPolicy{},
				},
				targetPodIsolation: podIsolation{
					Pod: podBuilder().name("Pod2").build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{
						networkPolicyBuilder().name("np").types("Ingress").ingressRule(networkingv1.NetworkPolicyIngressRule{
							From: []networkingv1.NetworkPolicyPeer{
								{
									NamespaceSelector: labelSelectorBuilder().matchLabel("name", "ns").build(),
									PodSelector:       labelSelectorBuilder().matchLabel("app", "bar").build(),
								},
							},
						}).build(),
					},
					EgressPolicies: []*networkingv1.NetworkPolicy{},
				},
				namespaces: []*corev1.Namespace{
					namespaceBuilder().name("ns").label("name", "ns").build(),
				},
			},
			expectedAllowedRoute: nil,
		},
		{
			name: "a non isolated pod can receive traffic from pod accepting its labels",
			args: args{
				sourcePodIsolation: podIsolation{
					Pod:             podBuilder().name("Pod1").build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies: []*networkingv1.NetworkPolicy{
						networkPolicyBuilder().name("np").types("Egress").egressRule(networkingv1.NetworkPolicyEgressRule{
							To: []networkingv1.NetworkPolicyPeer{
								{
									PodSelector: labelSelectorBuilder().matchLabel("app", "foo").build(),
								},
							},
						}).build(),
					},
				},
				targetPodIsolation: podIsolation{
					Pod:             podBuilder().name("Pod2").label("app", "foo").build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies:  []*networkingv1.NetworkPolicy{},
				},
				namespaces: []*corev1.Namespace{
					namespaceBuilder().name("default").build(),
				},
			},
			expectedAllowedRoute: &types.AllowedRoute{
				SourcePod: types.PodWithIsolation{Name: "Pod1", Namespace: "default", Labels: map[string]string{}, IsIngressIsolated: false, IsEgressIsolated: true},
				EgressPolicies: []types.NetworkPolicy{
					{Name: "np", Namespace: "default", Labels: map[string]string{}},
				},
				TargetPod:       types.PodWithIsolation{Name: "Pod2", Namespace: "default", Labels: map[string]string{"app": "foo"}, IsIngressIsolated: false, IsEgressIsolated: false},
				IngressPolicies: []types.NetworkPolicy{},
				Ports:           nil,
			},
		},
		{
			name: "a non isolated pod cannot receive traffic from pod rejecting its labels",
			args: args{
				sourcePodIsolation: podIsolation{
					Pod:             podBuilder().name("Pod1").build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies: []*networkingv1.NetworkPolicy{
						networkPolicyBuilder().name("np").types("Egress").egressRule(networkingv1.NetworkPolicyEgressRule{
							To: []networkingv1.NetworkPolicyPeer{
								{
									PodSelector: labelSelectorBuilder().matchLabel("app", "bar").build(),
								},
							},
						}).build(),
					},
				},
				targetPodIsolation: podIsolation{
					Pod:             podBuilder().name("Pod2").label("app", "foo").build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies:  []*networkingv1.NetworkPolicy{},
				},
				namespaces: []*corev1.Namespace{
					namespaceBuilder().name("default").build(),
				},
			},
			expectedAllowedRoute: nil,
		},
		{
			name: "a non isolated pod can receive traffic from pod accepting its namespace",
			args: args{
				sourcePodIsolation: podIsolation{
					Pod:             podBuilder().name("Pod1").build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies: []*networkingv1.NetworkPolicy{
						networkPolicyBuilder().name("np").types("Egress").egressRule(networkingv1.NetworkPolicyEgressRule{
							To: []networkingv1.NetworkPolicyPeer{
								{
									NamespaceSelector: labelSelectorBuilder().matchLabel("name", "ns").build(),
								},
							},
						}).build(),
					},
				},
				targetPodIsolation: podIsolation{
					Pod:             podBuilder().name("Pod2").namespace("ns").build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies:  []*networkingv1.NetworkPolicy{},
				},
				namespaces: []*corev1.Namespace{
					namespaceBuilder().name("ns").label("name", "ns").build(),
				},
			},
			expectedAllowedRoute: &types.AllowedRoute{
				SourcePod: types.PodWithIsolation{Name: "Pod1", Namespace: "default", Labels: map[string]string{}, IsIngressIsolated: false, IsEgressIsolated: true},
				EgressPolicies: []types.NetworkPolicy{
					{Name: "np", Namespace: "default", Labels: map[string]string{}},
				},
				TargetPod:       types.PodWithIsolation{Name: "Pod2", Namespace: "ns", Labels: map[string]string{}, IsIngressIsolated: false, IsEgressIsolated: false},
				IngressPolicies: []types.NetworkPolicy{},
				Ports:           nil,
			},
		},
		{
			name: "a non isolated pod cannot receive traffic from pod rejecting its namespace",
			args: args{
				sourcePodIsolation: podIsolation{
					Pod:             podBuilder().name("Pod1").build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies: []*networkingv1.NetworkPolicy{
						networkPolicyBuilder().name("np").types("Egress").egressRule(networkingv1.NetworkPolicyEgressRule{
							To: []networkingv1.NetworkPolicyPeer{
								{
									NamespaceSelector: labelSelectorBuilder().matchLabel("name", "other").build(),
								},
							},
						}).build(),
					},
				},
				targetPodIsolation: podIsolation{
					Pod:             podBuilder().name("Pod2").name("ns").build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies:  []*networkingv1.NetworkPolicy{},
				},
				namespaces: []*corev1.Namespace{
					namespaceBuilder().name("ns").label("name", "ns").build(),
				},
			},
			expectedAllowedRoute: nil,
		},
		{
			name: "a non isolated pod can receive traffic from pod accepting both its labels and namespace",
			args: args{
				sourcePodIsolation: podIsolation{
					Pod:             podBuilder().name("Pod1").build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies: []*networkingv1.NetworkPolicy{
						networkPolicyBuilder().name("np").types("Egress").egressRule(networkingv1.NetworkPolicyEgressRule{
							To: []networkingv1.NetworkPolicyPeer{
								{
									NamespaceSelector: labelSelectorBuilder().matchLabel("name", "ns").build(),
									PodSelector:       labelSelectorBuilder().matchLabel("app", "foo").build(),
								},
							},
						}).build(),
					},
				},
				targetPodIsolation: podIsolation{
					Pod:             podBuilder().name("Pod2").namespace("ns").label("app", "foo").build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies:  []*networkingv1.NetworkPolicy{},
				},
				namespaces: []*corev1.Namespace{
					namespaceBuilder().name("ns").label("name", "ns").build(),
				},
			},
			expectedAllowedRoute: &types.AllowedRoute{
				SourcePod: types.PodWithIsolation{Name: "Pod1", Namespace: "default", Labels: map[string]string{}, IsIngressIsolated: false, IsEgressIsolated: true},
				EgressPolicies: []types.NetworkPolicy{
					{Name: "np", Namespace: "default", Labels: map[string]string{}},
				},
				TargetPod:       types.PodWithIsolation{Name: "Pod2", Namespace: "ns", Labels: map[string]string{"app": "foo"}, IsIngressIsolated: false, IsEgressIsolated: false},
				IngressPolicies: []types.NetworkPolicy{},
				Ports:           nil,
			},
		},
		{
			name: "a non isolated pod cannot receive traffic from pod accepting its labels but not its namespace",
			args: args{
				sourcePodIsolation: podIsolation{
					Pod:             podBuilder().name("Pod1").build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies: []*networkingv1.NetworkPolicy{
						networkPolicyBuilder().name("np").types("Egress").egressRule(networkingv1.NetworkPolicyEgressRule{
							To: []networkingv1.NetworkPolicyPeer{
								{
									NamespaceSelector: labelSelectorBuilder().matchLabel("name", "other").build(),
									PodSelector:       labelSelectorBuilder().matchLabel("app", "foo").build(),
								},
							},
						}).build(),
					},
				},
				targetPodIsolation: podIsolation{
					Pod:             podBuilder().name("Pod2").namespace("ns").label("app", "foo").build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies:  []*networkingv1.NetworkPolicy{},
				},
				namespaces: []*corev1.Namespace{
					namespaceBuilder().name("ns").label("name", "ns").build(),
				},
			},
			expectedAllowedRoute: nil,
		},
		{
			name: "a non isolated pod cannot receive traffic from pod accepting its namespace but not its labels",
			args: args{
				sourcePodIsolation: podIsolation{
					Pod:             podBuilder().name("Pod1").build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies: []*networkingv1.NetworkPolicy{
						networkPolicyBuilder().name("np").types("Egress").egressRule(networkingv1.NetworkPolicyEgressRule{
							To: []networkingv1.NetworkPolicyPeer{
								{
									NamespaceSelector: labelSelectorBuilder().matchLabel("name", "ns").build(),
									PodSelector:       labelSelectorBuilder().matchLabel("app", "bar").build(),
								},
							},
						}).build(),
					},
				},
				targetPodIsolation: podIsolation{
					Pod:             podBuilder().name("Pod2").namespace("ns").label("app", "foo").build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies:  []*networkingv1.NetworkPolicy{},
				},
				namespaces: []*corev1.Namespace{
					namespaceBuilder().name("ns").label("name", "ns").build(),
				},
			},
			expectedAllowedRoute: nil,
		},
		{
			name: "allowed route ports are the intersection of ingress and egress rule ports",
			args: args{
				sourcePodIsolation: podIsolation{
					Pod:             podBuilder().name("Pod1").build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies: []*networkingv1.NetworkPolicy{
						networkPolicyBuilder().types("Egress").egressRule(networkingv1.NetworkPolicyEgressRule{
							To: []networkingv1.NetworkPolicyPeer{
								{
									PodSelector: labelSelectorBuilder().build(),
								},
							},
							Ports: []networkingv1.NetworkPolicyPort{
								{Port: &intstr.IntOrString{IntVal: 80}},
								{Port: &intstr.IntOrString{IntVal: 8080}},
							},
						}).build(),
					},
				},
				targetPodIsolation: podIsolation{
					Pod: podBuilder().name("Pod2").build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{
						networkPolicyBuilder().types("Ingress").ingressRule(networkingv1.NetworkPolicyIngressRule{
							From: []networkingv1.NetworkPolicyPeer{
								{
									PodSelector: labelSelectorBuilder().build(),
								},
							},
							Ports: []networkingv1.NetworkPolicyPort{
								{Port: &intstr.IntOrString{IntVal: 443}},
								{Port: &intstr.IntOrString{IntVal: 80}},
							},
						}).build(),
					},
					EgressPolicies: []*networkingv1.NetworkPolicy{},
				},
				namespaces: []*corev1.Namespace{
					namespaceBuilder().name("default").build(),
				},
			},
			expectedAllowedRoute: &types.AllowedRoute{
				SourcePod: types.PodWithIsolation{Name: "Pod1", Namespace: "default", Labels: map[string]string{}, IsIngressIsolated: false, IsEgressIsolated: true},
				EgressPolicies: []types.NetworkPolicy{
					{Namespace: "default", Labels: map[string]string{}},
				},
				TargetPod: types.PodWithIsolation{Name: "Pod2", Namespace: "default", Labels: map[string]string{}, IsIngressIsolated: true, IsEgressIsolated: false},
				IngressPolicies: []types.NetworkPolicy{
					{Namespace: "default", Labels: map[string]string{}},
				},
				Ports: []int32{80},
			},
		},
		{
			name: "allowed route ports are ingress rule ports when egress applies to all ports",
			args: args{
				sourcePodIsolation: podIsolation{
					Pod:             podBuilder().name("Pod1").build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies: []*networkingv1.NetworkPolicy{
						networkPolicyBuilder().types("Egress").egressRule(networkingv1.NetworkPolicyEgressRule{
							To: []networkingv1.NetworkPolicyPeer{
								{
									PodSelector: labelSelectorBuilder().build(),
								},
							},
						}).build(),
					},
				},
				targetPodIsolation: podIsolation{
					Pod: podBuilder().name("Pod2").build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{
						networkPolicyBuilder().types("Ingress").ingressRule(networkingv1.NetworkPolicyIngressRule{
							From: []networkingv1.NetworkPolicyPeer{
								{
									PodSelector: labelSelectorBuilder().build(),
								},
							},
							Ports: []networkingv1.NetworkPolicyPort{
								{Port: &intstr.IntOrString{IntVal: 443}},
								{Port: &intstr.IntOrString{IntVal: 80}},
							},
						}).build(),
					},
					EgressPolicies: []*networkingv1.NetworkPolicy{},
				},
				namespaces: []*corev1.Namespace{
					namespaceBuilder().name("default").build(),
				},
			},
			expectedAllowedRoute: &types.AllowedRoute{
				SourcePod: types.PodWithIsolation{Name: "Pod1", Namespace: "default", Labels: map[string]string{}, IsIngressIsolated: false, IsEgressIsolated: true},
				EgressPolicies: []types.NetworkPolicy{
					{Namespace: "default", Labels: map[string]string{}},
				},
				TargetPod: types.PodWithIsolation{Name: "Pod2", Namespace: "default", Labels: map[string]string{}, IsIngressIsolated: true, IsEgressIsolated: false},
				IngressPolicies: []types.NetworkPolicy{
					{Namespace: "default", Labels: map[string]string{}},
				},
				Ports: []int32{80, 443},
			},
		},
		{
			name: "allowed route ports are egress rule ports when ingress applies to all ports",
			args: args{
				sourcePodIsolation: podIsolation{
					Pod:             podBuilder().name("Pod1").build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies: []*networkingv1.NetworkPolicy{
						networkPolicyBuilder().types("Egress").egressRule(networkingv1.NetworkPolicyEgressRule{
							To: []networkingv1.NetworkPolicyPeer{
								{
									PodSelector: labelSelectorBuilder().build(),
								},
							},
							Ports: []networkingv1.NetworkPolicyPort{
								{Port: &intstr.IntOrString{IntVal: 443}},
								{Port: &intstr.IntOrString{IntVal: 80}},
							},
						}).build(),
					},
				},
				targetPodIsolation: podIsolation{
					Pod: podBuilder().name("Pod2").build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{
						networkPolicyBuilder().types("Ingress").ingressRule(networkingv1.NetworkPolicyIngressRule{
							From: []networkingv1.NetworkPolicyPeer{
								{
									PodSelector: labelSelectorBuilder().build(),
								},
							},
						}).build(),
					},
					EgressPolicies: []*networkingv1.NetworkPolicy{},
				},
				namespaces: []*corev1.Namespace{
					namespaceBuilder().name("default").build(),
				},
			},
			expectedAllowedRoute: &types.AllowedRoute{
				SourcePod: types.PodWithIsolation{Name: "Pod1", Namespace: "default", Labels: map[string]string{}, IsIngressIsolated: false, IsEgressIsolated: true},
				EgressPolicies: []types.NetworkPolicy{
					{Namespace: "default", Labels: map[string]string{}},
				},
				TargetPod: types.PodWithIsolation{Name: "Pod2", Namespace: "default", Labels: map[string]string{}, IsIngressIsolated: true, IsEgressIsolated: false},
				IngressPolicies: []types.NetworkPolicy{
					{Namespace: "default", Labels: map[string]string{}},
				},
				Ports: []int32{80, 443},
			},
		},
		{
			name: "allowed route ports is nil when both ingress and egress apply to all ports",
			args: args{
				sourcePodIsolation: podIsolation{
					Pod:             podBuilder().name("Pod1").build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies: []*networkingv1.NetworkPolicy{
						networkPolicyBuilder().types("Egress").egressRule(networkingv1.NetworkPolicyEgressRule{
							To: []networkingv1.NetworkPolicyPeer{
								{
									PodSelector: labelSelectorBuilder().build(),
								},
							},
						}).build(),
					},
				},
				targetPodIsolation: podIsolation{
					Pod: podBuilder().name("Pod2").build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{
						networkPolicyBuilder().types("Ingress").ingressRule(networkingv1.NetworkPolicyIngressRule{
							From: []networkingv1.NetworkPolicyPeer{
								{
									PodSelector: labelSelectorBuilder().build(),
								},
							},
						}).build(),
					},
					EgressPolicies: []*networkingv1.NetworkPolicy{},
				},
				namespaces: []*corev1.Namespace{
					namespaceBuilder().name("default").build(),
				},
			},
			expectedAllowedRoute: &types.AllowedRoute{
				SourcePod: types.PodWithIsolation{Name: "Pod1", Namespace: "default", Labels: map[string]string{}, IsIngressIsolated: false, IsEgressIsolated: true},
				EgressPolicies: []types.NetworkPolicy{
					{Namespace: "default", Labels: map[string]string{}},
				},
				TargetPod: types.PodWithIsolation{Name: "Pod2", Namespace: "default", Labels: map[string]string{}, IsIngressIsolated: true, IsEgressIsolated: false},
				IngressPolicies: []types.NetworkPolicy{
					{Namespace: "default", Labels: map[string]string{}},
				},
				Ports: nil,
			},
		},
		{
			name: "route is forbidden when ingress and egress have no ports in common",
			args: args{
				sourcePodIsolation: podIsolation{
					Pod:             podBuilder().name("Pod1").build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies: []*networkingv1.NetworkPolicy{
						networkPolicyBuilder().types("Egress").egressRule(networkingv1.NetworkPolicyEgressRule{
							To: []networkingv1.NetworkPolicyPeer{
								{
									PodSelector: labelSelectorBuilder().build(),
								},
							},
							Ports: []networkingv1.NetworkPolicyPort{
								{Port: &intstr.IntOrString{IntVal: 80}},
							},
						}).build(),
					},
				},
				targetPodIsolation: podIsolation{
					Pod: podBuilder().name("Pod2").build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{
						networkPolicyBuilder().types("Ingress").ingressRule(networkingv1.NetworkPolicyIngressRule{
							From: []networkingv1.NetworkPolicyPeer{
								{
									PodSelector: labelSelectorBuilder().build(),
								},
							},
							Ports: []networkingv1.NetworkPolicyPort{
								{Port: &intstr.IntOrString{IntVal: 443}},
							},
						}).build(),
					},
					EgressPolicies: []*networkingv1.NetworkPolicy{},
				},
				namespaces: []*corev1.Namespace{
					namespaceBuilder().name("default").build(),
				},
			},
			expectedAllowedRoute: nil,
		},
		{
			name: "allowed route only contains policies with allowed ports",
			args: args{
				sourcePodIsolation: podIsolation{
					Pod:             podBuilder().name("Pod1").build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies: []*networkingv1.NetworkPolicy{
						networkPolicyBuilder().name("eg1").types("Egress").egressRule(networkingv1.NetworkPolicyEgressRule{
							To: []networkingv1.NetworkPolicyPeer{
								{
									PodSelector: labelSelectorBuilder().build(),
								},
							},
							Ports: []networkingv1.NetworkPolicyPort{
								{Port: &intstr.IntOrString{IntVal: 80}},
							},
						}).build(),
						networkPolicyBuilder().name("eg2").types("Egress").egressRule(networkingv1.NetworkPolicyEgressRule{
							To: []networkingv1.NetworkPolicyPeer{
								{
									PodSelector: labelSelectorBuilder().build(),
								},
							},
							Ports: []networkingv1.NetworkPolicyPort{
								{Port: &intstr.IntOrString{IntVal: 5000}},
							},
						}).build(),
					},
				},
				targetPodIsolation: podIsolation{
					Pod: podBuilder().name("Pod2").build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{
						networkPolicyBuilder().name("in1").types("Ingress").ingressRule(networkingv1.NetworkPolicyIngressRule{
							From: []networkingv1.NetworkPolicyPeer{
								{
									PodSelector: labelSelectorBuilder().build(),
								},
							},
							Ports: []networkingv1.NetworkPolicyPort{
								{Port: &intstr.IntOrString{IntVal: 80}},
							},
						}).build(),
						networkPolicyBuilder().name("in2").types("Ingress").ingressRule(networkingv1.NetworkPolicyIngressRule{
							From: []networkingv1.NetworkPolicyPeer{
								{
									PodSelector: labelSelectorBuilder().build(),
								},
							},
							Ports: []networkingv1.NetworkPolicyPort{
								{Port: &intstr.IntOrString{IntVal: 7000}},
							},
						}).build(),
					},
					EgressPolicies: []*networkingv1.NetworkPolicy{},
				},
				namespaces: []*corev1.Namespace{
					namespaceBuilder().name("default").build(),
				},
			},
			expectedAllowedRoute: &types.AllowedRoute{
				SourcePod: types.PodWithIsolation{Name: "Pod1", Namespace: "default", Labels: map[string]string{}, IsIngressIsolated: false, IsEgressIsolated: true},
				EgressPolicies: []types.NetworkPolicy{
					{Name: "eg1", Namespace: "default", Labels: map[string]string{}},
				},
				TargetPod: types.PodWithIsolation{Name: "Pod2", Namespace: "default", Labels: map[string]string{}, IsIngressIsolated: true, IsEgressIsolated: false},
				IngressPolicies: []types.NetworkPolicy{
					{Name: "in1", Namespace: "default", Labels: map[string]string{}},
				},
				Ports: []int32{80},
			},
		},
	}
	for _, tt := range tests {
		allowedRoute := computeAllowedRoute(tt.args.sourcePodIsolation, tt.args.targetPodIsolation, tt.args.namespaces)
		t.Run(tt.name, func(t *testing.T) {
			if diff := cmp.Diff(tt.expectedAllowedRoute, allowedRoute); diff != "" {
				t.Errorf("computeAllowedRoute() result mismatch (-want +got):\n%s", diff)
			}
		})
	}
}

func Test_computeServiceWithTargetPods(t *testing.T) {
	type args struct {
		service *corev1.Service
		pods    []*corev1.Pod
	}
	tests := []struct {
		name                          string
		args                          args
		expectedServiceWithTargetPods types.Service
	}{
		{
			name: "service name and namespace are propagated",
			args: args{
				service: serviceBuilder().name("svc").namespace("ns").build(),
				pods:    []*corev1.Pod{},
			},
			expectedServiceWithTargetPods: types.Service{
				Name:       "svc",
				Namespace:  "ns",
				TargetPods: []types.Pod{},
			},
		},
		{
			name: "only pods with matching labels are detected as target",
			args: args{
				service: serviceBuilder().selectorLabel("app", "foo").build(),
				pods: []*corev1.Pod{
					podBuilder().label("app", "foo").build(),
					podBuilder().label("app", "bar").build(),
				},
			},
			expectedServiceWithTargetPods: types.Service{
				Namespace: "default",
				TargetPods: []types.Pod{
					{Namespace: "default", Labels: map[string]string{"app": "foo"}},
				},
			},
		},
		{
			name: "only pods within the same namespace are detected as target",
			args: args{
				service: serviceBuilder().namespace("ns").selectorLabel("app", "foo").build(),
				pods: []*corev1.Pod{
					podBuilder().namespace("ns").label("app", "foo").build(),
					podBuilder().namespace("other").label("app", "foo").build(),
				},
			},
			expectedServiceWithTargetPods: types.Service{
				Namespace: "ns",
				TargetPods: []types.Pod{
					{Namespace: "ns", Labels: map[string]string{"app": "foo"}},
				},
			},
		},
		{
			name: "service with no selector does not match any pod",
			args: args{
				service: &corev1.Service{
					ObjectMeta: v1.ObjectMeta{
						Namespace: "default",
					},
				},
				pods: []*corev1.Pod{
					podBuilder().label("app", "foo").build(),
					podBuilder().label("app", "bar").build(),
				},
			},
			expectedServiceWithTargetPods: types.Service{
				Namespace:  "default",
				TargetPods: []types.Pod{},
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			serviceWithTargetPods := computeServiceWithTargetPods(tt.args.service, tt.args.pods)
			if diff := cmp.Diff(tt.expectedServiceWithTargetPods, serviceWithTargetPods); diff != "" {
				t.Errorf("computeServiceWithTargetPods() result mismatch (-want +got):\n%s", diff)
			}
		})
	}
}

func Test_computeReplicaSetWithTargetPods(t *testing.T) {
	type args struct {
		replicaSet *appsv1.ReplicaSet
		pods       []*corev1.Pod
	}
	tests := []struct {
		name                             string
		args                             args
		expectedReplicaSetWithTargetPods *types.ReplicaSet
	}{
		{
			name: "replicaSet name and namespace are propagated",
			args: args{
				replicaSet: replicaSetBuilder().name("rs").namespace("ns").build(),
				pods:       []*corev1.Pod{},
			},
			expectedReplicaSetWithTargetPods: &types.ReplicaSet{
				Name:       "rs",
				Namespace:  "ns",
				TargetPods: []types.Pod{},
			},
		},
		{
			name: "replicaSets with 0 desired replicas are ignored",
			args: args{
				replicaSet: replicaSetBuilder().desiredReplicas(0).build(),
				pods:       []*corev1.Pod{},
			},
			expectedReplicaSetWithTargetPods: nil,
		},
		{
			name: "only pods with matching labels are detected as target",
			args: args{
				replicaSet: replicaSetBuilder().selectorLabel("app", "foo").build(),
				pods: []*corev1.Pod{
					podBuilder().label("app", "foo").build(),
					podBuilder().label("app", "bar").build(),
				},
			},
			expectedReplicaSetWithTargetPods: &types.ReplicaSet{
				Namespace: "default",
				TargetPods: []types.Pod{
					{Namespace: "default", Labels: map[string]string{"app": "foo"}},
				},
			},
		},
		{
			name: "only pods within the same namespace are detected as target",
			args: args{
				replicaSet: replicaSetBuilder().namespace("ns").selectorLabel("app", "foo").build(),
				pods: []*corev1.Pod{
					podBuilder().namespace("ns").label("app", "foo").build(),
					podBuilder().namespace("other").label("app", "foo").build(),
				},
			},
			expectedReplicaSetWithTargetPods: &types.ReplicaSet{
				Namespace: "ns",
				TargetPods: []types.Pod{
					{Namespace: "ns", Labels: map[string]string{"app": "foo"}},
				},
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			replicaSetWithTargetPods := computeReplicaSetWithTargetPods(tt.args.replicaSet, tt.args.pods)
			if diff := cmp.Diff(tt.expectedReplicaSetWithTargetPods, replicaSetWithTargetPods); diff != "" {
				t.Errorf("computeReplicaSetWithTargetPods() result mismatch (-want +got):\n%s", diff)
			}
		})
	}
}

type PodBuilder struct {
	Name      string
	Namespace string
	Labels    map[string]string
}

func podBuilder() *PodBuilder {
	return &PodBuilder{
		Namespace: "default",
		Labels:    map[string]string{},
	}
}

func (podBuilder *PodBuilder) name(name string) *PodBuilder {
	podBuilder.Name = name
	return podBuilder
}

func (podBuilder *PodBuilder) namespace(namespace string) *PodBuilder {
	podBuilder.Namespace = namespace
	return podBuilder
}

func (podBuilder *PodBuilder) label(key string, value string) *PodBuilder {
	podBuilder.Labels[key] = value
	return podBuilder
}

func (podBuilder *PodBuilder) build() *corev1.Pod {
	return &corev1.Pod{
		ObjectMeta: v1.ObjectMeta{
			Name:      podBuilder.Name,
			Namespace: podBuilder.Namespace,
			Labels:    podBuilder.Labels,
		},
	}
}

type NetworkPolicyBuilder struct {
	Name        string
	Namespace   string
	Labels      map[string]string
	PodSelector metav1.LabelSelector
	Types       []networkingv1.PolicyType
	Ingress     []networkingv1.NetworkPolicyIngressRule
	Egress      []networkingv1.NetworkPolicyEgressRule
}

func networkPolicyBuilder() *NetworkPolicyBuilder {
	return &NetworkPolicyBuilder{
		Namespace: "default",
		Labels:    map[string]string{},
		Ingress:   []networkingv1.NetworkPolicyIngressRule{},
	}
}

func (networkPolicyBuilder *NetworkPolicyBuilder) name(name string) *NetworkPolicyBuilder {
	networkPolicyBuilder.Name = name
	return networkPolicyBuilder
}

func (networkPolicyBuilder *NetworkPolicyBuilder) namespace(namespace string) *NetworkPolicyBuilder {
	networkPolicyBuilder.Namespace = namespace
	return networkPolicyBuilder
}

func (networkPolicyBuilder *NetworkPolicyBuilder) podSelector(podSelector *metav1.LabelSelector) *NetworkPolicyBuilder {
	networkPolicyBuilder.PodSelector = *podSelector
	return networkPolicyBuilder
}

func (networkPolicyBuilder *NetworkPolicyBuilder) types(types ...networkingv1.PolicyType) *NetworkPolicyBuilder {
	networkPolicyBuilder.Types = types
	return networkPolicyBuilder
}

func (networkPolicyBuilder *NetworkPolicyBuilder) ingressRule(ingressRule networkingv1.NetworkPolicyIngressRule) *NetworkPolicyBuilder {
	networkPolicyBuilder.Ingress = append(networkPolicyBuilder.Ingress, ingressRule)
	return networkPolicyBuilder
}

func (networkPolicyBuilder *NetworkPolicyBuilder) egressRule(egressRule networkingv1.NetworkPolicyEgressRule) *NetworkPolicyBuilder {
	networkPolicyBuilder.Egress = append(networkPolicyBuilder.Egress, egressRule)
	return networkPolicyBuilder
}

func (networkPolicyBuilder *NetworkPolicyBuilder) build() *networkingv1.NetworkPolicy {
	return &networkingv1.NetworkPolicy{
		ObjectMeta: metav1.ObjectMeta{
			Name:      networkPolicyBuilder.Name,
			Namespace: networkPolicyBuilder.Namespace,
			Labels:    networkPolicyBuilder.Labels,
		},
		Spec: networkingv1.NetworkPolicySpec{
			PodSelector: networkPolicyBuilder.PodSelector,
			PolicyTypes: networkPolicyBuilder.Types,
			Ingress:     networkPolicyBuilder.Ingress,
			Egress:      networkPolicyBuilder.Egress,
		},
	}
}

type LabelSelectorBuilder struct {
	MatchLabels map[string]string
}

func labelSelectorBuilder() *LabelSelectorBuilder {
	return &LabelSelectorBuilder{
		MatchLabels: map[string]string{},
	}
}

func (labelSelectorBuilder *LabelSelectorBuilder) matchLabel(key string, value string) *LabelSelectorBuilder {
	labelSelectorBuilder.MatchLabels[key] = value
	return labelSelectorBuilder
}

func (labelSelectorBuilder *LabelSelectorBuilder) build() *metav1.LabelSelector {
	return &metav1.LabelSelector{
		MatchLabels: labelSelectorBuilder.MatchLabels,
	}
}

type NamespaceBuilder struct {
	Name   string
	Labels map[string]string
}

func namespaceBuilder() *NamespaceBuilder {
	return &NamespaceBuilder{
		Labels: map[string]string{},
	}
}

func (namespaceBuilder *NamespaceBuilder) name(name string) *NamespaceBuilder {
	namespaceBuilder.Name = name
	return namespaceBuilder
}

func (namespaceBuilder *NamespaceBuilder) label(key string, value string) *NamespaceBuilder {
	namespaceBuilder.Labels[key] = value
	return namespaceBuilder
}

func (namespaceBuilder *NamespaceBuilder) build() *corev1.Namespace {
	return &corev1.Namespace{
		ObjectMeta: v1.ObjectMeta{
			Name:   namespaceBuilder.Name,
			Labels: namespaceBuilder.Labels,
		},
	}
}

type ServiceBuilder struct {
	Name      string
	Namespace string
	Selector  map[string]string
}

func serviceBuilder() *ServiceBuilder {
	return &ServiceBuilder{
		Namespace: "default",
		Selector:  map[string]string{},
	}
}

func (serviceBuilder *ServiceBuilder) name(name string) *ServiceBuilder {
	serviceBuilder.Name = name
	return serviceBuilder
}

func (serviceBuilder *ServiceBuilder) namespace(namespace string) *ServiceBuilder {
	serviceBuilder.Namespace = namespace
	return serviceBuilder
}

func (serviceBuilder *ServiceBuilder) selectorLabel(key string, value string) *ServiceBuilder {
	serviceBuilder.Selector[key] = value
	return serviceBuilder
}

func (serviceBuilder *ServiceBuilder) build() *corev1.Service {
	return &corev1.Service{
		ObjectMeta: v1.ObjectMeta{
			Name:      serviceBuilder.Name,
			Namespace: serviceBuilder.Namespace,
		},
		Spec: corev1.ServiceSpec{
			Selector: serviceBuilder.Selector,
		},
	}
}

type ReplicaSetBuilder struct {
	Name            string
	Namespace       string
	DesiredReplicas int32
	Selector        map[string]string
}

func replicaSetBuilder() *ReplicaSetBuilder {
	return &ReplicaSetBuilder{
		Namespace:       "default",
		DesiredReplicas: 1,
		Selector:        map[string]string{},
	}
}

func (replicaSetBuilder *ReplicaSetBuilder) name(name string) *ReplicaSetBuilder {
	replicaSetBuilder.Name = name
	return replicaSetBuilder
}

func (replicaSetBuilder *ReplicaSetBuilder) desiredReplicas(replicas int32) *ReplicaSetBuilder {
	replicaSetBuilder.DesiredReplicas = replicas
	return replicaSetBuilder
}

func (replicaSetBuilder *ReplicaSetBuilder) namespace(namespace string) *ReplicaSetBuilder {
	replicaSetBuilder.Namespace = namespace
	return replicaSetBuilder
}

func (replicaSetBuilder *ReplicaSetBuilder) selectorLabel(key string, value string) *ReplicaSetBuilder {
	replicaSetBuilder.Selector[key] = value
	return replicaSetBuilder
}

func (replicaSetBuilder *ReplicaSetBuilder) build() *appsv1.ReplicaSet {
	return &appsv1.ReplicaSet{
		ObjectMeta: v1.ObjectMeta{
			Name:      replicaSetBuilder.Name,
			Namespace: replicaSetBuilder.Namespace,
		},
		Spec: appsv1.ReplicaSetSpec{
			Replicas: &replicaSetBuilder.DesiredReplicas,
			Selector: &metav1.LabelSelector{
				MatchLabels: replicaSetBuilder.Selector,
			},
		},
	}
}
