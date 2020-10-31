package types

type Pod struct {
	Name              string            `json:"name"`
	Namespace         string            `json:"namespace"`
	Labels            map[string]string `json:"labels"`
	IsIngressIsolated bool              `json:"isIngressIsolated"`
	IsEgressIsolated  bool              `json:"isEgressIsolated"`
}

type PodRef struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
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

type ReplicaSet struct {
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
	TargetReplicaSets []ReplicaSetRef `json:"replicaSets"`
}

type AnalysisResult struct {
	Pods          []Pod          `json:"pods"`
	AllowedRoutes []AllowedRoute `json:"allowedRoutes"`
	Services      []Service      `json:"services"`
	ReplicaSets   []ReplicaSet   `json:"replicaSets"`
	Deployments   []Deployment   `json:"deployments"`
}
