package trafficanalyzer

import (
	"github.com/google/go-cmp/cmp"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"network-policy-explorer/types"
	"testing"
)

func Test_computePodIsolation(t *testing.T) {
	type args struct {
		pod             corev1.Pod
		networkPolicies networkingv1.NetworkPolicyList
	}
	tests := []struct {
		name                 string
		args                 args
		expectedPodIsolation types.PodIsolation
	}{
		{
			name: "a pod is not isolated by default",
			args: args{
				pod:             *podBuilder().name("Pod1").build(),
				networkPolicies: *networkPolicyList(),
			},
			expectedPodIsolation: types.PodIsolation{
				Pod:             *podBuilder().name("Pod1").build(),
				IngressPolicies: []networkingv1.NetworkPolicy{},
				EgressPolicies:  []networkingv1.NetworkPolicy{},
			},
		},
		{
			name: "a pod is isolated when a network policy matches its labels",
			args: args{
				pod: *podBuilder().name("Pod1").label("app", "foo").build(),
				networkPolicies: *networkPolicyList(
					*networkPolicyBuilder().types("Ingress", "Egress").podSelector(*labelSelectorBuilder().matchLabel("app", "foo").build()).build(),
				),
			},
			expectedPodIsolation: types.PodIsolation{
				Pod: *podBuilder().name("Pod1").label("app", "foo").build(),
				IngressPolicies: []networkingv1.NetworkPolicy{
					*networkPolicyBuilder().types("Ingress", "Egress").podSelector(*labelSelectorBuilder().matchLabel("app", "foo").build()).build(),
				},
				EgressPolicies: []networkingv1.NetworkPolicy{
					*networkPolicyBuilder().types("Ingress", "Egress").podSelector(*labelSelectorBuilder().matchLabel("app", "foo").build()).build(),
				},
			},
		},
		{
			name: "a pod is not isolated if no network policy matches its labels",
			args: args{
				pod: *podBuilder().name("Pod1").label("app", "foo").build(),
				networkPolicies: *networkPolicyList(
					*networkPolicyBuilder().types("Ingress", "Egress").podSelector(*labelSelectorBuilder().matchLabel("app", "bar").build()).build(),
				),
			},
			expectedPodIsolation: types.PodIsolation{
				Pod:             *podBuilder().name("Pod1").label("app", "foo").build(),
				IngressPolicies: []networkingv1.NetworkPolicy{},
				EgressPolicies:  []networkingv1.NetworkPolicy{},
			},
		},
		{
			name: "a network policy with empty selector matches all pods",
			args: args{
				pod: *podBuilder().name("Pod1").label("app", "foo").build(),
				networkPolicies: *networkPolicyList(
					*networkPolicyBuilder().types("Ingress", "Egress").podSelector(*labelSelectorBuilder().build()).build(),
				),
			},
			expectedPodIsolation: types.PodIsolation{
				Pod: *podBuilder().name("Pod1").label("app", "foo").build(),
				IngressPolicies: []networkingv1.NetworkPolicy{
					*networkPolicyBuilder().types("Ingress", "Egress").podSelector(*labelSelectorBuilder().build()).build(),
				},
				EgressPolicies: []networkingv1.NetworkPolicy{
					*networkPolicyBuilder().types("Ingress", "Egress").podSelector(*labelSelectorBuilder().build()).build(),
				},
			},
		},
		{
			name: "a pod is not isolated by a network policy from another namespace",
			args: args{
				pod: *podBuilder().name("Pod1").namespace("ns").build(),
				networkPolicies: *networkPolicyList(
					*networkPolicyBuilder().types("Ingress", "Egress").namespace("other").build(),
				),
			},
			expectedPodIsolation: types.PodIsolation{
				Pod:             *podBuilder().name("Pod1").namespace("ns").build(),
				IngressPolicies: []networkingv1.NetworkPolicy{},
				EgressPolicies:  []networkingv1.NetworkPolicy{},
			},
		},
		{
			name: "a pod can be isolated for ingress and not isolated for egress",
			args: args{
				pod: *podBuilder().name("Pod1").build(),
				networkPolicies: *networkPolicyList(
					*networkPolicyBuilder().types("Ingress").podSelector(*labelSelectorBuilder().build()).build(),
				),
			},
			expectedPodIsolation: types.PodIsolation{
				Pod: *podBuilder().name("Pod1").build(),
				IngressPolicies: []networkingv1.NetworkPolicy{
					*networkPolicyBuilder().types("Ingress").podSelector(*labelSelectorBuilder().build()).build(),
				},
				EgressPolicies: []networkingv1.NetworkPolicy{},
			},
		},
		{
			name: "a pod can be isolated for egress and not isolated for ingress",
			args: args{
				pod: *podBuilder().name("Pod1").build(),
				networkPolicies: *networkPolicyList(
					*networkPolicyBuilder().types("Egress").podSelector(*labelSelectorBuilder().build()).build(),
				),
			},
			expectedPodIsolation: types.PodIsolation{
				Pod:             *podBuilder().name("Pod1").build(),
				IngressPolicies: []networkingv1.NetworkPolicy{},
				EgressPolicies: []networkingv1.NetworkPolicy{
					*networkPolicyBuilder().types("Egress").podSelector(*labelSelectorBuilder().build()).build(),
				},
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			podIsolation := computePodIsolation(&tt.args.pod, &tt.args.networkPolicies)
			if diff := cmp.Diff(tt.expectedPodIsolation, *podIsolation); diff != "" {
				t.Errorf("computePodIsolation() result mismatch (-want +got):\n%s", diff)
			}
		})
	}
}

func Test_computeAllowedTraffic(t *testing.T) {
	type args struct {
		sourcePodIsolation types.PodIsolation
		targetPodIsolation types.PodIsolation
		namespaces         []corev1.Namespace
	}
	tests := []struct {
		name                   string
		args                   args
		expectedAllowedTraffic *types.AllowedTraffic
	}{
		{
			name: "a non isolated pod can send traffic to non isolated pod",
			args: args{
				sourcePodIsolation: types.PodIsolation{
					Pod: *podBuilder().name("Pod1").build(),
					IngressPolicies: []networkingv1.NetworkPolicy{
						*networkPolicyBuilder().types("Ingress").podSelector(*labelSelectorBuilder().build()).build(),
					},
					EgressPolicies: []networkingv1.NetworkPolicy{},
				},
				targetPodIsolation: types.PodIsolation{
					Pod:             *podBuilder().name("Pod2").build(),
					IngressPolicies: []networkingv1.NetworkPolicy{},
					EgressPolicies: []networkingv1.NetworkPolicy{
						*networkPolicyBuilder().types("Egress").podSelector(*labelSelectorBuilder().build()).build(),
					},
				},
				namespaces: []corev1.Namespace{
					*namespaceBuilder().name("default").build(),
				},
			},
			expectedAllowedTraffic: &types.AllowedTraffic{
				From:            *podBuilder().name("Pod1").build(),
				EgressPolicies:  nil,
				To:              *podBuilder().name("Pod2").build(),
				IngressPolicies: nil,
			},
		},
		{
			name: "a non isolated pod can send traffic to pod accepting its labels",
			args: args{
				sourcePodIsolation: types.PodIsolation{
					Pod:             *podBuilder().name("Pod1").label("app", "foo").build(),
					IngressPolicies: []networkingv1.NetworkPolicy{},
					EgressPolicies:  []networkingv1.NetworkPolicy{},
				},
				targetPodIsolation: types.PodIsolation{
					Pod: *podBuilder().name("Pod2").build(),
					IngressPolicies: []networkingv1.NetworkPolicy{
						*networkPolicyBuilder().types("Ingress").ingressRule(networkingv1.NetworkPolicyIngressRule{
							From: []networkingv1.NetworkPolicyPeer{
								{
									PodSelector: labelSelectorBuilder().matchLabel("app", "foo").build(),
								},
							},
						}).build(),
					},
					EgressPolicies: []networkingv1.NetworkPolicy{},
				},
				namespaces: []corev1.Namespace{
					*namespaceBuilder().name("default").build(),
				},
			},
			expectedAllowedTraffic: &types.AllowedTraffic{
				From:            *podBuilder().name("Pod1").label("app", "foo").build(),
				EgressPolicies:  nil,
				To:              *podBuilder().name("Pod2").build(),
				IngressPolicies: nil,
			},
		},
		{
			name: "a non isolated pod cannot send traffic to pod rejecting its labels",
			args: args{
				sourcePodIsolation: types.PodIsolation{
					Pod:             *podBuilder().name("Pod1").label("app", "foo").build(),
					IngressPolicies: []networkingv1.NetworkPolicy{},
					EgressPolicies:  []networkingv1.NetworkPolicy{},
				},
				targetPodIsolation: types.PodIsolation{
					Pod: *podBuilder().name("Pod2").build(),
					IngressPolicies: []networkingv1.NetworkPolicy{
						*networkPolicyBuilder().types("Ingress").ingressRule(networkingv1.NetworkPolicyIngressRule{
							From: []networkingv1.NetworkPolicyPeer{
								{
									PodSelector: labelSelectorBuilder().matchLabel("app", "bar").build(),
								},
							},
						}).build(),
					},
					EgressPolicies: []networkingv1.NetworkPolicy{},
				},
				namespaces: []corev1.Namespace{
					*namespaceBuilder().name("default").build(),
				},
			},
			expectedAllowedTraffic: nil,
		},
		{
			name: "a non isolated pod can send traffic to pod accepting its namespace",
			args: args{
				sourcePodIsolation: types.PodIsolation{
					Pod:             *podBuilder().name("Pod1").namespace("ns").build(),
					IngressPolicies: []networkingv1.NetworkPolicy{},
					EgressPolicies:  []networkingv1.NetworkPolicy{},
				},
				targetPodIsolation: types.PodIsolation{
					Pod: *podBuilder().name("Pod2").build(),
					IngressPolicies: []networkingv1.NetworkPolicy{
						*networkPolicyBuilder().types("Ingress").ingressRule(networkingv1.NetworkPolicyIngressRule{
							From: []networkingv1.NetworkPolicyPeer{
								{
									NamespaceSelector: labelSelectorBuilder().matchLabel("name", "ns").build(),
								},
							},
						}).build(),
					},
					EgressPolicies: []networkingv1.NetworkPolicy{},
				},
				namespaces: []corev1.Namespace{
					*namespaceBuilder().name("ns").label("name", "ns").build(),
				},
			},
			expectedAllowedTraffic: &types.AllowedTraffic{
				From:            *podBuilder().name("Pod1").namespace("ns").build(),
				EgressPolicies:  nil,
				To:              *podBuilder().name("Pod2").build(),
				IngressPolicies: nil,
			},
		},
		{
			name: "a non isolated pod cannot send traffic to pod rejecting its namespace",
			args: args{
				sourcePodIsolation: types.PodIsolation{
					Pod:             *podBuilder().name("Pod1").namespace("ns").build(),
					IngressPolicies: []networkingv1.NetworkPolicy{},
					EgressPolicies:  []networkingv1.NetworkPolicy{},
				},
				targetPodIsolation: types.PodIsolation{
					Pod: *podBuilder().name("Pod2").build(),
					IngressPolicies: []networkingv1.NetworkPolicy{
						*networkPolicyBuilder().types("Ingress").ingressRule(networkingv1.NetworkPolicyIngressRule{
							From: []networkingv1.NetworkPolicyPeer{
								{
									NamespaceSelector: labelSelectorBuilder().matchLabel("name", "other").build(),
								},
							},
						}).build(),
					},
					EgressPolicies: []networkingv1.NetworkPolicy{},
				},
				namespaces: []corev1.Namespace{
					*namespaceBuilder().name("ns").label("name", "ns").build(),
				},
			},
			expectedAllowedTraffic: nil,
		},
		{
			name: "a non isolated pod can send traffic to pod accepting both its labels and namespace",
			args: args{
				sourcePodIsolation: types.PodIsolation{
					Pod:             *podBuilder().name("Pod1").namespace("ns").label("app", "foo").build(),
					IngressPolicies: []networkingv1.NetworkPolicy{},
					EgressPolicies:  []networkingv1.NetworkPolicy{},
				},
				targetPodIsolation: types.PodIsolation{
					Pod: *podBuilder().name("Pod2").build(),
					IngressPolicies: []networkingv1.NetworkPolicy{
						*networkPolicyBuilder().types("Ingress").ingressRule(networkingv1.NetworkPolicyIngressRule{
							From: []networkingv1.NetworkPolicyPeer{
								{
									NamespaceSelector: labelSelectorBuilder().matchLabel("name", "ns").build(),
									PodSelector:       labelSelectorBuilder().matchLabel("app", "foo").build(),
								},
							},
						}).build(),
					},
					EgressPolicies: []networkingv1.NetworkPolicy{},
				},
				namespaces: []corev1.Namespace{
					*namespaceBuilder().name("ns").label("name", "ns").build(),
				},
			},
			expectedAllowedTraffic: &types.AllowedTraffic{
				From:            *podBuilder().name("Pod1").namespace("ns").label("app", "foo").build(),
				EgressPolicies:  nil,
				To:              *podBuilder().name("Pod2").build(),
				IngressPolicies: nil,
			},
		},
		{
			name: "a non isolated pod cannot send traffic to pod accepting its labels but not its namespace",
			args: args{
				sourcePodIsolation: types.PodIsolation{
					Pod:             *podBuilder().name("Pod1").namespace("ns").label("app", "foo").build(),
					IngressPolicies: []networkingv1.NetworkPolicy{},
					EgressPolicies:  []networkingv1.NetworkPolicy{},
				},
				targetPodIsolation: types.PodIsolation{
					Pod: *podBuilder().name("Pod2").build(),
					IngressPolicies: []networkingv1.NetworkPolicy{
						*networkPolicyBuilder().types("Ingress").ingressRule(networkingv1.NetworkPolicyIngressRule{
							From: []networkingv1.NetworkPolicyPeer{
								{
									NamespaceSelector: labelSelectorBuilder().matchLabel("name", "other").build(),
									PodSelector:       labelSelectorBuilder().matchLabel("app", "foo").build(),
								},
							},
						}).build(),
					},
					EgressPolicies: []networkingv1.NetworkPolicy{},
				},
				namespaces: []corev1.Namespace{
					*namespaceBuilder().name("ns").label("name", "ns").build(),
				},
			},
			expectedAllowedTraffic: nil,
		},
		{
			name: "a non isolated pod cannot send traffic to pod accepting its namespace but not its labels",
			args: args{
				sourcePodIsolation: types.PodIsolation{
					Pod:             *podBuilder().name("Pod1").namespace("ns").label("app", "foo").build(),
					IngressPolicies: []networkingv1.NetworkPolicy{},
					EgressPolicies:  []networkingv1.NetworkPolicy{},
				},
				targetPodIsolation: types.PodIsolation{
					Pod: *podBuilder().name("Pod2").build(),
					IngressPolicies: []networkingv1.NetworkPolicy{
						*networkPolicyBuilder().types("Ingress").ingressRule(networkingv1.NetworkPolicyIngressRule{
							From: []networkingv1.NetworkPolicyPeer{
								{
									NamespaceSelector: labelSelectorBuilder().matchLabel("name", "ns").build(),
									PodSelector:       labelSelectorBuilder().matchLabel("app", "bar").build(),
								},
							},
						}).build(),
					},
					EgressPolicies: []networkingv1.NetworkPolicy{},
				},
				namespaces: []corev1.Namespace{
					*namespaceBuilder().name("ns").label("name", "ns").build(),
				},
			},
			expectedAllowedTraffic: nil,
		},
		{
			name: "a non isolated pod can receive traffic from pod accepting its labels",
			args: args{
				sourcePodIsolation: types.PodIsolation{
					Pod:             *podBuilder().name("Pod1").build(),
					IngressPolicies: []networkingv1.NetworkPolicy{},
					EgressPolicies: []networkingv1.NetworkPolicy{
						*networkPolicyBuilder().types("Egress").egressRule(networkingv1.NetworkPolicyEgressRule{
							To: []networkingv1.NetworkPolicyPeer{
								{
									PodSelector: labelSelectorBuilder().matchLabel("app", "foo").build(),
								},
							},
						}).build(),
					},
				},
				targetPodIsolation: types.PodIsolation{
					Pod:             *podBuilder().name("Pod2").label("app", "foo").build(),
					IngressPolicies: []networkingv1.NetworkPolicy{},
					EgressPolicies:  []networkingv1.NetworkPolicy{},
				},
				namespaces: []corev1.Namespace{
					*namespaceBuilder().name("default").build(),
				},
			},
			expectedAllowedTraffic: &types.AllowedTraffic{
				From:            *podBuilder().name("Pod1").build(),
				EgressPolicies:  nil,
				To:              *podBuilder().name("Pod2").label("app", "foo").build(),
				IngressPolicies: nil,
			},
		},
		{
			name: "a non isolated pod cannot receive traffic from pod rejecting its labels",
			args: args{
				sourcePodIsolation: types.PodIsolation{
					Pod:             *podBuilder().name("Pod1").build(),
					IngressPolicies: []networkingv1.NetworkPolicy{},
					EgressPolicies: []networkingv1.NetworkPolicy{
						*networkPolicyBuilder().types("Egress").egressRule(networkingv1.NetworkPolicyEgressRule{
							To: []networkingv1.NetworkPolicyPeer{
								{
									PodSelector: labelSelectorBuilder().matchLabel("app", "bar").build(),
								},
							},
						}).build(),
					},
				},
				targetPodIsolation: types.PodIsolation{
					Pod:             *podBuilder().name("Pod2").label("app", "foo").build(),
					IngressPolicies: []networkingv1.NetworkPolicy{},
					EgressPolicies:  []networkingv1.NetworkPolicy{},
				},
				namespaces: []corev1.Namespace{
					*namespaceBuilder().name("default").build(),
				},
			},
			expectedAllowedTraffic: nil,
		},
		{
			name: "a non isolated pod can receive traffic from pod accepting its namespace",
			args: args{
				sourcePodIsolation: types.PodIsolation{
					Pod:             *podBuilder().name("Pod1").build(),
					IngressPolicies: []networkingv1.NetworkPolicy{},
					EgressPolicies: []networkingv1.NetworkPolicy{
						*networkPolicyBuilder().types("Egress").egressRule(networkingv1.NetworkPolicyEgressRule{
							To: []networkingv1.NetworkPolicyPeer{
								{
									NamespaceSelector: labelSelectorBuilder().matchLabel("name", "ns").build(),
								},
							},
						}).build(),
					},
				},
				targetPodIsolation: types.PodIsolation{
					Pod:             *podBuilder().name("Pod2").namespace("ns").build(),
					IngressPolicies: []networkingv1.NetworkPolicy{},
					EgressPolicies:  []networkingv1.NetworkPolicy{},
				},
				namespaces: []corev1.Namespace{
					*namespaceBuilder().name("ns").label("name", "ns").build(),
				},
			},
			expectedAllowedTraffic: &types.AllowedTraffic{
				From:            *podBuilder().name("Pod1").build(),
				EgressPolicies:  nil,
				To:              *podBuilder().name("Pod2").namespace("ns").build(),
				IngressPolicies: nil,
			},
		},
		{
			name: "a non isolated pod cannot receive traffic from pod rejecting its namespace",
			args: args{
				sourcePodIsolation: types.PodIsolation{
					Pod:             *podBuilder().name("Pod1").build(),
					IngressPolicies: []networkingv1.NetworkPolicy{},
					EgressPolicies: []networkingv1.NetworkPolicy{
						*networkPolicyBuilder().types("Egress").egressRule(networkingv1.NetworkPolicyEgressRule{
							To: []networkingv1.NetworkPolicyPeer{
								{
									NamespaceSelector: labelSelectorBuilder().matchLabel("name", "other").build(),
								},
							},
						}).build(),
					},
				},
				targetPodIsolation: types.PodIsolation{
					Pod:             *podBuilder().name("Pod2").name("ns").build(),
					IngressPolicies: []networkingv1.NetworkPolicy{},
					EgressPolicies:  []networkingv1.NetworkPolicy{},
				},
				namespaces: []corev1.Namespace{
					*namespaceBuilder().name("ns").label("name", "ns").build(),
				},
			},
			expectedAllowedTraffic: nil,
		},
		{
			name: "a non isolated pod can receive traffic from pod accepting both its labels and namespace",
			args: args{
				sourcePodIsolation: types.PodIsolation{
					Pod:             *podBuilder().name("Pod1").build(),
					IngressPolicies: []networkingv1.NetworkPolicy{},
					EgressPolicies: []networkingv1.NetworkPolicy{
						*networkPolicyBuilder().types("Egress").egressRule(networkingv1.NetworkPolicyEgressRule{
							To: []networkingv1.NetworkPolicyPeer{
								{
									NamespaceSelector: labelSelectorBuilder().matchLabel("name", "ns").build(),
									PodSelector:       labelSelectorBuilder().matchLabel("app", "foo").build(),
								},
							},
						}).build(),
					},
				},
				targetPodIsolation: types.PodIsolation{
					Pod:             *podBuilder().name("Pod2").namespace("ns").label("app", "foo").build(),
					IngressPolicies: []networkingv1.NetworkPolicy{},
					EgressPolicies:  []networkingv1.NetworkPolicy{},
				},
				namespaces: []corev1.Namespace{
					*namespaceBuilder().name("ns").label("name", "ns").build(),
				},
			},
			expectedAllowedTraffic: &types.AllowedTraffic{
				From:            *podBuilder().name("Pod1").build(),
				EgressPolicies:  nil,
				To:              *podBuilder().name("Pod2").namespace("ns").label("app", "foo").build(),
				IngressPolicies: nil,
			},
		},
		{
			name: "a non isolated pod cannot receive traffic from pod accepting its labels but not its namespace",
			args: args{
				sourcePodIsolation: types.PodIsolation{
					Pod:             *podBuilder().name("Pod1").build(),
					IngressPolicies: []networkingv1.NetworkPolicy{},
					EgressPolicies: []networkingv1.NetworkPolicy{
						*networkPolicyBuilder().types("Egress").egressRule(networkingv1.NetworkPolicyEgressRule{
							To: []networkingv1.NetworkPolicyPeer{
								{
									NamespaceSelector: labelSelectorBuilder().matchLabel("name", "other").build(),
									PodSelector:       labelSelectorBuilder().matchLabel("app", "foo").build(),
								},
							},
						}).build(),
					},
				},
				targetPodIsolation: types.PodIsolation{
					Pod:             *podBuilder().name("Pod2").namespace("ns").label("app", "foo").build(),
					IngressPolicies: []networkingv1.NetworkPolicy{},
					EgressPolicies:  []networkingv1.NetworkPolicy{},
				},
				namespaces: []corev1.Namespace{
					*namespaceBuilder().name("ns").label("name", "ns").build(),
				},
			},
			expectedAllowedTraffic: nil,
		},
		{
			name: "a non isolated pod cannot receive traffic from pod accepting its namespace but not its labels",
			args: args{
				sourcePodIsolation: types.PodIsolation{
					Pod:             *podBuilder().name("Pod1").build(),
					IngressPolicies: []networkingv1.NetworkPolicy{},
					EgressPolicies: []networkingv1.NetworkPolicy{
						*networkPolicyBuilder().types("Egress").egressRule(networkingv1.NetworkPolicyEgressRule{
							To: []networkingv1.NetworkPolicyPeer{
								{
									NamespaceSelector: labelSelectorBuilder().matchLabel("name", "ns").build(),
									PodSelector:       labelSelectorBuilder().matchLabel("app", "bar").build(),
								},
							},
						}).build(),
					},
				},
				targetPodIsolation: types.PodIsolation{
					Pod:             *podBuilder().name("Pod2").namespace("ns").label("app", "foo").build(),
					IngressPolicies: []networkingv1.NetworkPolicy{},
					EgressPolicies:  []networkingv1.NetworkPolicy{},
				},
				namespaces: []corev1.Namespace{
					*namespaceBuilder().name("ns").label("name", "ns").build(),
				},
			},
			expectedAllowedTraffic: nil,
		},
	}
	for _, tt := range tests {
		allowedTraffic := computeAllowedTraffic(&tt.args.sourcePodIsolation, &tt.args.targetPodIsolation, tt.args.namespaces)
		t.Run(tt.name, func(t *testing.T) {
			if diff := cmp.Diff(tt.expectedAllowedTraffic, allowedTraffic); diff != "" {
				t.Errorf("computeAllowedTraffic() result mismatch (-want +got):\n%s", diff)
			}
		})
	}
}

func networkPolicyList(networkPolicies ...networkingv1.NetworkPolicy) *networkingv1.NetworkPolicyList {
	return &networkingv1.NetworkPolicyList{
		Items: networkPolicies,
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
	Namespace   string
	PodSelector metav1.LabelSelector
	Types       []networkingv1.PolicyType
	Ingress     []networkingv1.NetworkPolicyIngressRule
	Egress      []networkingv1.NetworkPolicyEgressRule
}

func networkPolicyBuilder() *NetworkPolicyBuilder {
	return &NetworkPolicyBuilder{
		Namespace: "default",
		Ingress:   []networkingv1.NetworkPolicyIngressRule{},
	}
}

func (networkPolicyBuilder *NetworkPolicyBuilder) namespace(namespace string) *NetworkPolicyBuilder {
	networkPolicyBuilder.Namespace = namespace
	return networkPolicyBuilder
}

func (networkPolicyBuilder *NetworkPolicyBuilder) podSelector(podSelecor metav1.LabelSelector) *NetworkPolicyBuilder {
	networkPolicyBuilder.PodSelector = podSelecor
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
			Namespace: networkPolicyBuilder.Namespace,
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
