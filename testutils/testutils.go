package testutils

import (
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
)

type NamespaceBuilder struct {
	Name   string
	Labels map[string]string
}

func NewNamespaceBuilder() *NamespaceBuilder {
	return &NamespaceBuilder{
		Labels: map[string]string{},
	}
}

func (namespaceBuilder *NamespaceBuilder) WithName(name string) *NamespaceBuilder {
	namespaceBuilder.Name = name
	return namespaceBuilder
}

func (namespaceBuilder *NamespaceBuilder) WithLabel(key string, value string) *NamespaceBuilder {
	namespaceBuilder.Labels[key] = value
	return namespaceBuilder
}

func (namespaceBuilder *NamespaceBuilder) Build() *corev1.Namespace {
	return &corev1.Namespace{
		ObjectMeta: v1.ObjectMeta{
			Name:   namespaceBuilder.Name,
			Labels: namespaceBuilder.Labels,
		},
	}
}

type PodBuilder struct {
	Name      string
	Namespace string
	Labels    map[string]string
}

func NewPodBuilder() *PodBuilder {
	return &PodBuilder{
		Namespace: "default",
		Labels:    map[string]string{},
	}
}

func (podBuilder *PodBuilder) WithName(name string) *PodBuilder {
	podBuilder.Name = name
	return podBuilder
}

func (podBuilder *PodBuilder) WithNamespace(namespace string) *PodBuilder {
	podBuilder.Namespace = namespace
	return podBuilder
}

func (podBuilder *PodBuilder) WithLabel(key string, value string) *PodBuilder {
	podBuilder.Labels[key] = value
	return podBuilder
}

func (podBuilder *PodBuilder) Build() *corev1.Pod {
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

func NewNetworkPolicyBuilder() *NetworkPolicyBuilder {
	return &NetworkPolicyBuilder{
		Namespace: "default",
		Labels:    map[string]string{},
		Ingress:   []networkingv1.NetworkPolicyIngressRule{},
	}
}

func (networkPolicyBuilder *NetworkPolicyBuilder) WithName(name string) *NetworkPolicyBuilder {
	networkPolicyBuilder.Name = name
	return networkPolicyBuilder
}

func (networkPolicyBuilder *NetworkPolicyBuilder) WithNamespace(namespace string) *NetworkPolicyBuilder {
	networkPolicyBuilder.Namespace = namespace
	return networkPolicyBuilder
}

func (networkPolicyBuilder *NetworkPolicyBuilder) WithPodSelector(podSelector *metav1.LabelSelector) *NetworkPolicyBuilder {
	networkPolicyBuilder.PodSelector = *podSelector
	return networkPolicyBuilder
}

func (networkPolicyBuilder *NetworkPolicyBuilder) WithTypes(types ...networkingv1.PolicyType) *NetworkPolicyBuilder {
	networkPolicyBuilder.Types = types
	return networkPolicyBuilder
}

func (networkPolicyBuilder *NetworkPolicyBuilder) WithIngressRule(ingressRule networkingv1.NetworkPolicyIngressRule) *NetworkPolicyBuilder {
	networkPolicyBuilder.Ingress = append(networkPolicyBuilder.Ingress, ingressRule)
	return networkPolicyBuilder
}

func (networkPolicyBuilder *NetworkPolicyBuilder) WithEgressRule(egressRule networkingv1.NetworkPolicyEgressRule) *NetworkPolicyBuilder {
	networkPolicyBuilder.Egress = append(networkPolicyBuilder.Egress, egressRule)
	return networkPolicyBuilder
}

func (networkPolicyBuilder *NetworkPolicyBuilder) Build() *networkingv1.NetworkPolicy {
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

func NewLabelSelectorBuilder() *LabelSelectorBuilder {
	return &LabelSelectorBuilder{
		MatchLabels: map[string]string{},
	}
}

func (labelSelectorBuilder *LabelSelectorBuilder) WithMatchLabel(key string, value string) *LabelSelectorBuilder {
	labelSelectorBuilder.MatchLabels[key] = value
	return labelSelectorBuilder
}

func (labelSelectorBuilder *LabelSelectorBuilder) Build() *metav1.LabelSelector {
	return &metav1.LabelSelector{
		MatchLabels: labelSelectorBuilder.MatchLabels,
	}
}

type ServiceBuilder struct {
	Name      string
	Namespace string
	Selector  map[string]string
}

func NewServiceBuilder() *ServiceBuilder {
	return &ServiceBuilder{
		Namespace: "default",
		Selector:  map[string]string{},
	}
}

func (serviceBuilder *ServiceBuilder) WithName(name string) *ServiceBuilder {
	serviceBuilder.Name = name
	return serviceBuilder
}

func (serviceBuilder *ServiceBuilder) WithNamespace(namespace string) *ServiceBuilder {
	serviceBuilder.Namespace = namespace
	return serviceBuilder
}

func (serviceBuilder *ServiceBuilder) WithSelectorLabel(key string, value string) *ServiceBuilder {
	serviceBuilder.Selector[key] = value
	return serviceBuilder
}

func (serviceBuilder *ServiceBuilder) Build() *corev1.Service {
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
	deploymentUID   string
	DesiredReplicas int32
	Selector        map[string]string
}

func NewReplicaSetBuilder() *ReplicaSetBuilder {
	return &ReplicaSetBuilder{
		Namespace:       "default",
		DesiredReplicas: 1,
		Selector:        map[string]string{},
	}
}

func (replicaSetBuilder *ReplicaSetBuilder) WithName(name string) *ReplicaSetBuilder {
	replicaSetBuilder.Name = name
	return replicaSetBuilder
}

func (replicaSetBuilder *ReplicaSetBuilder) WithNamespace(namespace string) *ReplicaSetBuilder {
	replicaSetBuilder.Namespace = namespace
	return replicaSetBuilder
}

func (replicaSetBuilder *ReplicaSetBuilder) WithDesiredReplicas(replicas int32) *ReplicaSetBuilder {
	replicaSetBuilder.DesiredReplicas = replicas
	return replicaSetBuilder
}

func (replicaSetBuilder *ReplicaSetBuilder) WithSelectorLabel(key string, value string) *ReplicaSetBuilder {
	replicaSetBuilder.Selector[key] = value
	return replicaSetBuilder
}

func (replicaSetBuilder *ReplicaSetBuilder) WithOwnerDeployment(deploymentUID string) *ReplicaSetBuilder {
	replicaSetBuilder.deploymentUID = deploymentUID
	return replicaSetBuilder
}

func (replicaSetBuilder *ReplicaSetBuilder) Build() *appsv1.ReplicaSet {
	return &appsv1.ReplicaSet{
		ObjectMeta: v1.ObjectMeta{
			Name:      replicaSetBuilder.Name,
			Namespace: replicaSetBuilder.Namespace,
			OwnerReferences: []v1.OwnerReference{
				{UID: types.UID(replicaSetBuilder.deploymentUID)},
			},
		},
		Spec: appsv1.ReplicaSetSpec{
			Replicas: &replicaSetBuilder.DesiredReplicas,
			Selector: &metav1.LabelSelector{
				MatchLabels: replicaSetBuilder.Selector,
			},
		},
	}
}

type DeploymentBuilder struct {
	Name      string
	Namespace string
	UID       string
}

func NewDeploymentBuilder() *DeploymentBuilder {
	return &DeploymentBuilder{
		Namespace: "default",
	}
}

func (deploymentBuilder *DeploymentBuilder) WithName(name string) *DeploymentBuilder {
	deploymentBuilder.Name = name
	return deploymentBuilder
}

func (deploymentBuilder *DeploymentBuilder) WithNamespace(namespace string) *DeploymentBuilder {
	deploymentBuilder.Namespace = namespace
	return deploymentBuilder
}

func (deploymentBuilder *DeploymentBuilder) WithUID(UID string) *DeploymentBuilder {
	deploymentBuilder.UID = UID
	return deploymentBuilder
}

func (deploymentBuilder *DeploymentBuilder) Build() *appsv1.Deployment {
	return &appsv1.Deployment{
		ObjectMeta: v1.ObjectMeta{
			Name:      deploymentBuilder.Name,
			Namespace: deploymentBuilder.Namespace,
			UID:       types.UID(deploymentBuilder.UID),
		},
	}
}
