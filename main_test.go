package main

import (
	"github.com/google/go-cmp/cmp"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"testing"
)

func Test_computePodIsolation(t *testing.T) {
	type args struct {
		pods            *corev1.PodList
		networkPolicies *networkingv1.NetworkPolicyList
	}
	tests := []struct {
		name                  string
		args                  args
		expectedPodIsolations []PodIsolation
	}{
		{
			name: "nothing with no pods",
			args: args{
				pods:            podList(),
				networkPolicies: networkPolicyList(),
			},
			expectedPodIsolations: []PodIsolation{},
		},
		{
			name: "all pods non isolated with no policies",
			args: args{
				pods: podList(
					podBuilder().name("Pod1").build(),
					podBuilder().name("Pod2").build(),
				),
				networkPolicies: networkPolicyList(),
			},
			expectedPodIsolations: []PodIsolation{
				{
					Pod:             podBuilder().name("Pod1").build(),
					IngressPolicies: []networkingv1.NetworkPolicy{},
					EgressPolicies:  []networkingv1.NetworkPolicy{},
				},
				{
					Pod:             podBuilder().name("Pod2").build(),
					IngressPolicies: []networkingv1.NetworkPolicy{},
					EgressPolicies:  []networkingv1.NetworkPolicy{},
				},
			},
		},
		{
			name: "pods with matching labels isolated",
			args: args{
				pods: podList(
					podBuilder().name("Pod1").label("app", "foo").build(),
					podBuilder().name("Pod2").build(),
				),
				networkPolicies: networkPolicyList(
					networkPolicyBuilder().types("Ingress", "Egress").podSelector(labelSelectorBuilder().matchLabel("app", "foo").build()).build(),
				),
			},
			expectedPodIsolations: []PodIsolation{
				{
					Pod: podBuilder().name("Pod1").label("app", "foo").build(),
					IngressPolicies: []networkingv1.NetworkPolicy{
						networkPolicyBuilder().types("Ingress", "Egress").podSelector(labelSelectorBuilder().matchLabel("app", "foo").build()).build(),
					},
					EgressPolicies: []networkingv1.NetworkPolicy{
						networkPolicyBuilder().types("Ingress", "Egress").podSelector(labelSelectorBuilder().matchLabel("app", "foo").build()).build(),
					},
				},
				{
					Pod:             podBuilder().name("Pod2").build(),
					IngressPolicies: []networkingv1.NetworkPolicy{},
					EgressPolicies:  []networkingv1.NetworkPolicy{},
				},
			},
		},
		{
			name: "all pods isolated with matchAll selector",
			args: args{
				pods: podList(
					podBuilder().name("Pod1").label("app", "foo").build(),
					podBuilder().name("Pod2").build(),
				),
				networkPolicies: networkPolicyList(
					networkPolicyBuilder().types("Ingress", "Egress").podSelector(labelSelectorBuilder().build()).build(),
				),
			},
			expectedPodIsolations: []PodIsolation{
				{
					Pod: podBuilder().name("Pod1").label("app", "foo").build(),
					IngressPolicies: []networkingv1.NetworkPolicy{
						networkPolicyBuilder().types("Ingress", "Egress").podSelector(labelSelectorBuilder().build()).build(),
					},
					EgressPolicies: []networkingv1.NetworkPolicy{
						networkPolicyBuilder().types("Ingress", "Egress").podSelector(labelSelectorBuilder().build()).build(),
					},
				},
				{
					Pod: podBuilder().name("Pod2").build(),
					IngressPolicies: []networkingv1.NetworkPolicy{
						networkPolicyBuilder().types("Ingress", "Egress").podSelector(labelSelectorBuilder().build()).build(),
					},
					EgressPolicies: []networkingv1.NetworkPolicy{
						networkPolicyBuilder().types("Ingress", "Egress").podSelector(labelSelectorBuilder().build()).build(),
					},
				},
			},
		},
		{
			name: "pods with matching labels only isolated when in same namespace",
			args: args{
				pods: podList(
					podBuilder().name("Pod1").namespace("ns").label("app", "foo").build(),
					podBuilder().name("Pod2").namespace("other").label("app", "foo").build(),
				),
				networkPolicies: networkPolicyList(
					networkPolicyBuilder().types("Ingress", "Egress").namespace("ns").podSelector(labelSelectorBuilder().matchLabel("app", "foo").build()).build(),
				),
			},
			expectedPodIsolations: []PodIsolation{
				{
					Pod: podBuilder().name("Pod1").namespace("ns").label("app", "foo").build(),
					IngressPolicies: []networkingv1.NetworkPolicy{
						networkPolicyBuilder().types("Ingress", "Egress").namespace("ns").podSelector(labelSelectorBuilder().matchLabel("app", "foo").build()).build(),
					},
					EgressPolicies: []networkingv1.NetworkPolicy{
						networkPolicyBuilder().types("Ingress", "Egress").namespace("ns").podSelector(labelSelectorBuilder().matchLabel("app", "foo").build()).build(),
					},
				},
				{
					Pod:             podBuilder().name("Pod2").namespace("other").label("app", "foo").build(),
					IngressPolicies: []networkingv1.NetworkPolicy{},
					EgressPolicies:  []networkingv1.NetworkPolicy{},
				},
			},
		},
		{
			name: "ingress and egress isolation are independent",
			args: args{
				pods: podList(
					podBuilder().name("Pod1").build(),
				),
				networkPolicies: networkPolicyList(
					networkPolicyBuilder().types("Ingress").podSelector(labelSelectorBuilder().build()).build(),
					networkPolicyBuilder().types("Egress").podSelector(labelSelectorBuilder().build()).build(),
				),
			},
			expectedPodIsolations: []PodIsolation{
				{
					Pod: podBuilder().name("Pod1").build(),
					IngressPolicies: []networkingv1.NetworkPolicy{
						networkPolicyBuilder().types("Ingress").podSelector(labelSelectorBuilder().build()).build(),
					},
					EgressPolicies: []networkingv1.NetworkPolicy{
						networkPolicyBuilder().types("Egress").podSelector(labelSelectorBuilder().build()).build(),
					},
				},
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			podIsolations := computePodIsolation(tt.args.pods, tt.args.networkPolicies)
			if diff := cmp.Diff(tt.expectedPodIsolations, podIsolations); diff != "" {
				t.Errorf("computePodIsolation() result mismatch (-want +got):\n%s", diff)
			}
		})
	}
}

func podList(pods ...corev1.Pod) *corev1.PodList {
	return &corev1.PodList{
		Items: pods,
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
		Labels: map[string]string{},
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

func (podBuilder *PodBuilder) build() corev1.Pod {
	return corev1.Pod{
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
}

func networkPolicyBuilder() *NetworkPolicyBuilder {
	return &NetworkPolicyBuilder{}
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

func (networkPolicyBuilder *NetworkPolicyBuilder) build() networkingv1.NetworkPolicy {
	return networkingv1.NetworkPolicy{
		ObjectMeta: metav1.ObjectMeta{
			Namespace: networkPolicyBuilder.Namespace,
		},
		Spec: networkingv1.NetworkPolicySpec{
			PodSelector: networkPolicyBuilder.PodSelector,
			PolicyTypes: networkPolicyBuilder.Types,
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

func (labelSelectorBuilder *LabelSelectorBuilder) build() metav1.LabelSelector {
	return metav1.LabelSelector{
		MatchLabels: labelSelectorBuilder.MatchLabels,
	}
}
