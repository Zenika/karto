package types

import (
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	networkingv1beta1 "k8s.io/api/networking/v1beta1"
)

type ClusterState struct {
	Namespaces      []*corev1.Namespace
	Pods            []*corev1.Pod
	Services        []*corev1.Service
	Ingresses       []*networkingv1beta1.Ingress
	ReplicaSets     []*appsv1.ReplicaSet
	StatefulSets    []*appsv1.StatefulSet
	DaemonSets      []*appsv1.DaemonSet
	Deployments     []*appsv1.Deployment
	NetworkPolicies []*networkingv1.NetworkPolicy
}

type Pod struct {
	Name      string            `json:"name"`
	Namespace string            `json:"namespace"`
	Labels    map[string]string `json:"labels"`
}

type PodRef struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
}

type PodIsolation struct {
	Pod               PodRef `json:"pod"`
	IsIngressIsolated bool   `json:"isIngressIsolated"`
	IsEgressIsolated  bool   `json:"isEgressIsolated"`
}

type NetworkPolicy struct {
	Name      string            `json:"name"`
	Namespace string            `json:"namespace"`
	Labels    map[string]string `json:"labels"`
}

type AllowedRoute struct {
	SourcePod       PodRef          `json:"sourcePod"`
	EgressPolicies  []NetworkPolicy `json:"egressPolicies"`
	TargetPod       PodRef          `json:"targetPod"`
	IngressPolicies []NetworkPolicy `json:"ingressPolicies"`
	Ports           []int32         `json:"ports"`
}

type Service struct {
	Name       string   `json:"name"`
	Namespace  string   `json:"namespace"`
	TargetPods []PodRef `json:"targetPods"`
}

type ServiceRef struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
}

type Ingress struct {
	Name           string       `json:"name"`
	Namespace      string       `json:"namespace"`
	TargetServices []ServiceRef `json:"targetServices"`
}

type ReplicaSet struct {
	Name       string   `json:"name"`
	Namespace  string   `json:"namespace"`
	TargetPods []PodRef `json:"targetPods"`
}

type StatefulSet struct {
	Name       string   `json:"name"`
	Namespace  string   `json:"namespace"`
	TargetPods []PodRef `json:"targetPods"`
}

type DaemonSet struct {
	Name       string   `json:"name"`
	Namespace  string   `json:"namespace"`
	TargetPods []PodRef `json:"targetPods"`
}

type ReplicaSetRef struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
}

type Deployment struct {
	Name              string          `json:"name"`
	Namespace         string          `json:"namespace"`
	TargetReplicaSets []ReplicaSetRef `json:"targetReplicaSets"`
}

type AnalysisResult struct {
	Pods          []*Pod          `json:"pods"`
	PodIsolations []*PodIsolation `json:"podIsolations"`
	AllowedRoutes []*AllowedRoute `json:"allowedRoutes"`
	Services      []*Service      `json:"services"`
	Ingresses     []*Ingress      `json:"ingresses"`
	ReplicaSets   []*ReplicaSet   `json:"replicaSets"`
	StatefulSets  []*StatefulSet  `json:"statefulSets"`
	DaemonSets    []*DaemonSet    `json:"daemonSets"`
	Deployments   []*Deployment   `json:"deployments"`
}
