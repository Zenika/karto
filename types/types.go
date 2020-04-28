package types

type Pod struct {
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
	SourcePod       Pod             `json:"sourcePod"`
	EgressPolicies  []NetworkPolicy `json:"egressPolicies"`
	TargetPod       Pod             `json:"targetPod"`
	IngressPolicies []NetworkPolicy `json:"ingressPolicies"`
}

type AnalysisResult struct {
	Pods          []Pod          `json:"pods"`
	AllowedRoutes []AllowedRoute `json:"allowedRoutes"`
}
