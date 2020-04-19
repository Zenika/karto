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
		name                    string
		args                    args
		expectedIsolatedPods    []corev1.Pod
		expectedNonIsolatedPods []corev1.Pod
	}{
		{
			name: "nothing with no pods",
			args: args{
				pods:            podList(),
				networkPolicies: networkPolicyList(),
			},
			expectedIsolatedPods:    []corev1.Pod{},
			expectedNonIsolatedPods: []corev1.Pod{},
		},
		{
			name: "all pods nonIsolated with no policies",
			args: args{
				pods: podList(
					podBuilder().name("Pod1").build(),
					podBuilder().name("Pod2").build(),
				),
				networkPolicies: networkPolicyList(),
			},
			expectedIsolatedPods: []corev1.Pod{},
			expectedNonIsolatedPods: []corev1.Pod{
				podBuilder().name("Pod1").build(),
				podBuilder().name("Pod2").build(),
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
					networkPolicyBuilder().podSelector(labelSelectorBuilder().matchLabel("app", "foo").build()).build(),
				),
			},
			expectedIsolatedPods: []corev1.Pod{
				podBuilder().name("Pod1").label("app", "foo").build(),
			},
			expectedNonIsolatedPods: []corev1.Pod{
				podBuilder().name("Pod2").build(),
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
					networkPolicyBuilder().podSelector(labelSelectorBuilder().build()).build(),
				),
			},
			expectedIsolatedPods: []corev1.Pod{
				podBuilder().name("Pod1").label("app", "foo").build(),
				podBuilder().name("Pod2").build(),
			},
			expectedNonIsolatedPods: []corev1.Pod{},
		},
		{
			name: "pods with matching labels in other namespace nonIsolated",
			args: args{
				pods: podList(
					podBuilder().name("Pod1").namespace("ns").label("app", "foo").build(),
					podBuilder().name("Pod2").namespace("other").label("app", "foo").build(),
				),
				networkPolicies: networkPolicyList(
					networkPolicyBuilder().
						namespace("ns").
						podSelector(labelSelectorBuilder().matchLabel("app", "foo").build()).
						build(),
				),
			},
			expectedIsolatedPods: []corev1.Pod{
				podBuilder().name("Pod1").namespace("ns").label("app", "foo").build(),
			},
			expectedNonIsolatedPods: []corev1.Pod{
				podBuilder().name("Pod2").namespace("other").label("app", "foo").build(),
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			isolatedPods, nonIsolatedPods := computePodIsolation(tt.args.pods, tt.args.networkPolicies)
			if diff := cmp.Diff(tt.expectedIsolatedPods, isolatedPods); diff != "" {
				t.Errorf("computePodIsolation() isolatedPods mismatch (-want +got):\n%s", diff)
			}
			if diff := cmp.Diff(tt.expectedNonIsolatedPods, nonIsolatedPods); diff != "" {
				t.Errorf("computePodIsolation() nonIsolatedPods mismatch (-want +got):\n%s", diff)
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

func (networkPolicyBuilder *NetworkPolicyBuilder) build() networkingv1.NetworkPolicy {
	return networkingv1.NetworkPolicy{
		ObjectMeta: metav1.ObjectMeta{
			Namespace: networkPolicyBuilder.Namespace,
		},
		Spec: networkingv1.NetworkPolicySpec{
			PodSelector: networkPolicyBuilder.PodSelector,
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
