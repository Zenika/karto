package types

type Pod struct {
	Name      string            `json:"name"`
	Namespace string            `json:"namespace"`
	Labels    map[string]string `json:"labels"`
}

type PodWithIsolation struct {
	Name              string            `json:"name"`
	Namespace         string            `json:"namespace"`
	Labels            map[string]string `json:"labels"`
	IsIngressIsolated bool              `json:"isIngressIsolated"`
	IsEgressIsolated  bool              `json:"isEgressIsolated"`
}

type NetworkPolicy struct {
	Name      string            `json:"name"`
	Namespace string            `json:"namespace"`
	Labels    map[string]string `json:"labels"`
}

type AllowedRoute struct {
	SourcePod       PodWithIsolation `json:"sourcePod"`
	EgressPolicies  []NetworkPolicy  `json:"egressPolicies"`
	TargetPod       PodWithIsolation `json:"targetPod"`
	IngressPolicies []NetworkPolicy  `json:"ingressPolicies"`
	Ports           []int32          `json:"ports"`
}

type Service struct {
	Name       string `json:"name"`
	Namespace  string `json:"namespace"`
	TargetPods []Pod  `json:"targetPods"`
}

type ReplicaSet struct {
	Name       string `json:"name"`
	Namespace  string `json:"namespace"`
	TargetPods []Pod  `json:"targetPods"`
}

type AnalysisResult struct {
	Pods          []PodWithIsolation `json:"pods"`
	AllowedRoutes []AllowedRoute     `json:"allowedRoutes"`
	Services      []Service          `json:"services"`
	ReplicaSets   []ReplicaSet       `json:"replicaSets"`
}
