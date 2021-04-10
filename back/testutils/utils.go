package testutils

import (
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	networkingv1beta1 "k8s.io/api/networking/v1beta1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
)

type NamespaceBuilder struct {
	name   string
	labels map[string]string
}

func NewNamespaceBuilder() *NamespaceBuilder {
	return &NamespaceBuilder{
		labels: map[string]string{},
	}
}

func (namespaceBuilder *NamespaceBuilder) WithName(name string) *NamespaceBuilder {
	namespaceBuilder.name = name
	return namespaceBuilder
}

func (namespaceBuilder *NamespaceBuilder) WithLabel(key string, value string) *NamespaceBuilder {
	namespaceBuilder.labels[key] = value
	return namespaceBuilder
}

func (namespaceBuilder *NamespaceBuilder) Build() *corev1.Namespace {
	return &corev1.Namespace{
		ObjectMeta: v1.ObjectMeta{
			Name:   namespaceBuilder.name,
			Labels: namespaceBuilder.labels,
		},
	}
}

type PodBuilder struct {
	name              string
	namespace         string
	ownerUID          string
	labels            map[string]string
	containerStatuses []corev1.ContainerStatus
}

func NewPodBuilder() *PodBuilder {
	return &PodBuilder{
		namespace:         "default",
		labels:            map[string]string{},
		containerStatuses: make([]corev1.ContainerStatus, 0),
	}
}

func (podBuilder *PodBuilder) WithName(name string) *PodBuilder {
	podBuilder.name = name
	return podBuilder
}

func (podBuilder *PodBuilder) WithNamespace(namespace string) *PodBuilder {
	podBuilder.namespace = namespace
	return podBuilder
}

func (podBuilder *PodBuilder) WithLabel(key string, value string) *PodBuilder {
	podBuilder.labels[key] = value
	return podBuilder
}

func (podBuilder *PodBuilder) WithOwnerUID(ownerUID string) *PodBuilder {
	podBuilder.ownerUID = ownerUID
	return podBuilder
}

func (podBuilder *PodBuilder) WithContainerStatus(isRunning bool, isReady bool, restartCount int32) *PodBuilder {
	containerStatus := corev1.ContainerStatus{
		State:        corev1.ContainerState{},
		Ready:        isReady,
		RestartCount: restartCount,
	}
	if isRunning {
		containerStatus.State.Running = &corev1.ContainerStateRunning{}
	} else {
		containerStatus.State.Waiting = &corev1.ContainerStateWaiting{}
	}
	podBuilder.containerStatuses = append(podBuilder.containerStatuses, containerStatus)
	return podBuilder
}

func (podBuilder *PodBuilder) Build() *corev1.Pod {
	return &corev1.Pod{
		ObjectMeta: v1.ObjectMeta{
			Name:      podBuilder.name,
			Namespace: podBuilder.namespace,
			Labels:    podBuilder.labels,
			OwnerReferences: []v1.OwnerReference{
				{UID: types.UID(podBuilder.ownerUID)},
			},
		},
		Status: corev1.PodStatus{
			ContainerStatuses: podBuilder.containerStatuses,
		},
	}
}

type NetworkPolicyBuilder struct {
	name        string
	namespace   string
	labels      map[string]string
	podSelector metav1.LabelSelector
	types       []networkingv1.PolicyType
	ingress     []networkingv1.NetworkPolicyIngressRule
	egress      []networkingv1.NetworkPolicyEgressRule
}

func NewNetworkPolicyBuilder() *NetworkPolicyBuilder {
	return &NetworkPolicyBuilder{
		namespace: "default",
		labels:    map[string]string{},
		ingress:   []networkingv1.NetworkPolicyIngressRule{},
	}
}

func (networkPolicyBuilder *NetworkPolicyBuilder) WithName(name string) *NetworkPolicyBuilder {
	networkPolicyBuilder.name = name
	return networkPolicyBuilder
}

func (networkPolicyBuilder *NetworkPolicyBuilder) WithNamespace(namespace string) *NetworkPolicyBuilder {
	networkPolicyBuilder.namespace = namespace
	return networkPolicyBuilder
}

func (networkPolicyBuilder *NetworkPolicyBuilder) WithLabel(key string, value string) *NetworkPolicyBuilder {
	networkPolicyBuilder.labels[key] = value
	return networkPolicyBuilder
}

func (networkPolicyBuilder *NetworkPolicyBuilder) WithPodSelector(
	podSelector *metav1.LabelSelector) *NetworkPolicyBuilder {
	networkPolicyBuilder.podSelector = *podSelector
	return networkPolicyBuilder
}

func (networkPolicyBuilder *NetworkPolicyBuilder) WithTypes(types ...networkingv1.PolicyType) *NetworkPolicyBuilder {
	networkPolicyBuilder.types = types
	return networkPolicyBuilder
}

func (networkPolicyBuilder *NetworkPolicyBuilder) WithIngressRule(
	ingressRule networkingv1.NetworkPolicyIngressRule) *NetworkPolicyBuilder {
	networkPolicyBuilder.ingress = append(networkPolicyBuilder.ingress, ingressRule)
	return networkPolicyBuilder
}

func (networkPolicyBuilder *NetworkPolicyBuilder) WithEgressRule(
	egressRule networkingv1.NetworkPolicyEgressRule) *NetworkPolicyBuilder {
	networkPolicyBuilder.egress = append(networkPolicyBuilder.egress, egressRule)
	return networkPolicyBuilder
}

func (networkPolicyBuilder *NetworkPolicyBuilder) Build() *networkingv1.NetworkPolicy {
	return &networkingv1.NetworkPolicy{
		ObjectMeta: metav1.ObjectMeta{
			Name:      networkPolicyBuilder.name,
			Namespace: networkPolicyBuilder.namespace,
			Labels:    networkPolicyBuilder.labels,
		},
		Spec: networkingv1.NetworkPolicySpec{
			PodSelector: networkPolicyBuilder.podSelector,
			PolicyTypes: networkPolicyBuilder.types,
			Ingress:     networkPolicyBuilder.ingress,
			Egress:      networkPolicyBuilder.egress,
		},
	}
}

type LabelSelectorBuilder struct {
	matchLabels map[string]string
}

func NewLabelSelectorBuilder() *LabelSelectorBuilder {
	return &LabelSelectorBuilder{
		matchLabels: map[string]string{},
	}
}

func (labelSelectorBuilder *LabelSelectorBuilder) WithMatchLabel(key string, value string) *LabelSelectorBuilder {
	labelSelectorBuilder.matchLabels[key] = value
	return labelSelectorBuilder
}

func (labelSelectorBuilder *LabelSelectorBuilder) Build() *metav1.LabelSelector {
	return &metav1.LabelSelector{
		MatchLabels: labelSelectorBuilder.matchLabels,
	}
}

type ServiceBuilder struct {
	name      string
	namespace string
	selector  map[string]string
}

func NewServiceBuilder() *ServiceBuilder {
	return &ServiceBuilder{
		namespace: "default",
		selector:  map[string]string{},
	}
}

func (serviceBuilder *ServiceBuilder) WithName(name string) *ServiceBuilder {
	serviceBuilder.name = name
	return serviceBuilder
}

func (serviceBuilder *ServiceBuilder) WithNamespace(namespace string) *ServiceBuilder {
	serviceBuilder.namespace = namespace
	return serviceBuilder
}

func (serviceBuilder *ServiceBuilder) WithSelectorLabel(key string, value string) *ServiceBuilder {
	serviceBuilder.selector[key] = value
	return serviceBuilder
}

func (serviceBuilder *ServiceBuilder) Build() *corev1.Service {
	return &corev1.Service{
		ObjectMeta: v1.ObjectMeta{
			Name:      serviceBuilder.name,
			Namespace: serviceBuilder.namespace,
		},
		Spec: corev1.ServiceSpec{
			Selector: serviceBuilder.selector,
		},
	}
}

type ReplicaSetBuilder struct {
	name            string
	namespace       string
	uid             string
	ownerUid        string
	desiredReplicas int32
}

func NewReplicaSetBuilder() *ReplicaSetBuilder {
	return &ReplicaSetBuilder{
		namespace:       "default",
		desiredReplicas: 1,
	}
}

func (replicaSetBuilder *ReplicaSetBuilder) WithName(name string) *ReplicaSetBuilder {
	replicaSetBuilder.name = name
	return replicaSetBuilder
}

func (replicaSetBuilder *ReplicaSetBuilder) WithNamespace(namespace string) *ReplicaSetBuilder {
	replicaSetBuilder.namespace = namespace
	return replicaSetBuilder
}

func (replicaSetBuilder *ReplicaSetBuilder) WithUID(UID string) *ReplicaSetBuilder {
	replicaSetBuilder.uid = UID
	return replicaSetBuilder
}

func (replicaSetBuilder *ReplicaSetBuilder) WithDesiredReplicas(replicas int32) *ReplicaSetBuilder {
	replicaSetBuilder.desiredReplicas = replicas
	return replicaSetBuilder
}

func (replicaSetBuilder *ReplicaSetBuilder) WithOwnerUID(ownerUID string) *ReplicaSetBuilder {
	replicaSetBuilder.ownerUid = ownerUID
	return replicaSetBuilder
}

func (replicaSetBuilder *ReplicaSetBuilder) Build() *appsv1.ReplicaSet {
	return &appsv1.ReplicaSet{
		ObjectMeta: v1.ObjectMeta{
			Name:      replicaSetBuilder.name,
			Namespace: replicaSetBuilder.namespace,
			UID:       types.UID(replicaSetBuilder.uid),
			OwnerReferences: []v1.OwnerReference{
				{UID: types.UID(replicaSetBuilder.ownerUid)},
			},
		},
		Spec: appsv1.ReplicaSetSpec{
			Replicas: &replicaSetBuilder.desiredReplicas,
		},
	}
}

type StatefulSetBuilder struct {
	name            string
	namespace       string
	uid             string
	desiredReplicas int32
}

func NewStatefulSetBuilder() *StatefulSetBuilder {
	return &StatefulSetBuilder{
		namespace:       "default",
		desiredReplicas: 1,
	}
}

func (statefulSetBuilder *StatefulSetBuilder) WithName(name string) *StatefulSetBuilder {
	statefulSetBuilder.name = name
	return statefulSetBuilder
}

func (statefulSetBuilder *StatefulSetBuilder) WithNamespace(namespace string) *StatefulSetBuilder {
	statefulSetBuilder.namespace = namespace
	return statefulSetBuilder
}

func (statefulSetBuilder *StatefulSetBuilder) WithUID(UID string) *StatefulSetBuilder {
	statefulSetBuilder.uid = UID
	return statefulSetBuilder
}

func (statefulSetBuilder *StatefulSetBuilder) WithDesiredReplicas(replicas int32) *StatefulSetBuilder {
	statefulSetBuilder.desiredReplicas = replicas
	return statefulSetBuilder
}

func (statefulSetBuilder *StatefulSetBuilder) Build() *appsv1.StatefulSet {
	return &appsv1.StatefulSet{
		ObjectMeta: v1.ObjectMeta{
			Name:      statefulSetBuilder.name,
			Namespace: statefulSetBuilder.namespace,
			UID:       types.UID(statefulSetBuilder.uid),
		},
		Spec: appsv1.StatefulSetSpec{
			Replicas: &statefulSetBuilder.desiredReplicas,
		},
	}
}

type DaemonSetBuilder struct {
	name      string
	namespace string
	uid       string
}

func NewDaemonSetBuilder() *DaemonSetBuilder {
	return &DaemonSetBuilder{
		namespace: "default",
	}
}

func (daemonSetBuilder *DaemonSetBuilder) WithName(name string) *DaemonSetBuilder {
	daemonSetBuilder.name = name
	return daemonSetBuilder
}

func (daemonSetBuilder *DaemonSetBuilder) WithNamespace(namespace string) *DaemonSetBuilder {
	daemonSetBuilder.namespace = namespace
	return daemonSetBuilder
}

func (daemonSetBuilder *DaemonSetBuilder) WithUID(UID string) *DaemonSetBuilder {
	daemonSetBuilder.uid = UID
	return daemonSetBuilder
}

func (daemonSetBuilder *DaemonSetBuilder) Build() *appsv1.DaemonSet {
	return &appsv1.DaemonSet{
		ObjectMeta: v1.ObjectMeta{
			Name:      daemonSetBuilder.name,
			Namespace: daemonSetBuilder.namespace,
			UID:       types.UID(daemonSetBuilder.uid),
		},
	}
}

type IngressBuilder struct {
	name            string
	namespace       string
	serviceBackends []string
}

func NewIngressBuilder() *IngressBuilder {
	return &IngressBuilder{
		namespace:       "default",
		serviceBackends: make([]string, 0),
	}
}

func (ingressBuilder *IngressBuilder) WithName(name string) *IngressBuilder {
	ingressBuilder.name = name
	return ingressBuilder
}

func (ingressBuilder *IngressBuilder) WithNamespace(namespace string) *IngressBuilder {
	ingressBuilder.namespace = namespace
	return ingressBuilder
}

func (ingressBuilder *IngressBuilder) WithServiceBackend(serviceName string) *IngressBuilder {
	ingressBuilder.serviceBackends = append(ingressBuilder.serviceBackends, serviceName)
	return ingressBuilder
}

func (ingressBuilder *IngressBuilder) Build() *networkingv1beta1.Ingress {
	ingressPaths := make([]networkingv1beta1.HTTPIngressPath, 0)
	for _, serviceBackend := range ingressBuilder.serviceBackends {
		ingressPath := networkingv1beta1.HTTPIngressPath{
			Backend: networkingv1beta1.IngressBackend{
				ServiceName: serviceBackend,
			},
		}
		ingressPaths = append(ingressPaths, ingressPath)
	}
	return &networkingv1beta1.Ingress{
		ObjectMeta: v1.ObjectMeta{
			Name:      ingressBuilder.name,
			Namespace: ingressBuilder.namespace,
		},
		Spec: networkingv1beta1.IngressSpec{
			Rules: []networkingv1beta1.IngressRule{
				{
					IngressRuleValue: networkingv1beta1.IngressRuleValue{
						HTTP: &networkingv1beta1.HTTPIngressRuleValue{
							Paths: ingressPaths,
						},
					},
				},
			},
		},
	}
}

type DeploymentBuilder struct {
	name      string
	namespace string
	uid       string
}

func NewDeploymentBuilder() *DeploymentBuilder {
	return &DeploymentBuilder{
		namespace: "default",
	}
}

func (deploymentBuilder *DeploymentBuilder) WithName(name string) *DeploymentBuilder {
	deploymentBuilder.name = name
	return deploymentBuilder
}

func (deploymentBuilder *DeploymentBuilder) WithNamespace(namespace string) *DeploymentBuilder {
	deploymentBuilder.namespace = namespace
	return deploymentBuilder
}

func (deploymentBuilder *DeploymentBuilder) WithUID(UID string) *DeploymentBuilder {
	deploymentBuilder.uid = UID
	return deploymentBuilder
}

func (deploymentBuilder *DeploymentBuilder) Build() *appsv1.Deployment {
	return &appsv1.Deployment{
		ObjectMeta: v1.ObjectMeta{
			Name:      deploymentBuilder.name,
			Namespace: deploymentBuilder.namespace,
			UID:       types.UID(deploymentBuilder.uid),
		},
	}
}
