package allowedroute

import (
	"github.com/google/go-cmp/cmp"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	"k8s.io/apimachinery/pkg/util/intstr"
	"karto/analyzer/traffic/shared"
	"karto/testutils"
	"karto/types"
	"testing"
)

func Test_Analyze(t *testing.T) {
	type args struct {
		sourcePodIsolation shared.PodIsolation
		targetPodIsolation shared.PodIsolation
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
				sourcePodIsolation: shared.PodIsolation{
					Pod: testutils.NewPodBuilder().WithName("Pod1").Build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{
						testutils.NewNetworkPolicyBuilder().WithTypes("Ingress").WithPodSelector(testutils.NewLabelSelectorBuilder().Build()).Build(),
					},
					EgressPolicies: []*networkingv1.NetworkPolicy{},
				},
				targetPodIsolation: shared.PodIsolation{
					Pod:             testutils.NewPodBuilder().WithName("Pod2").Build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies: []*networkingv1.NetworkPolicy{
						testutils.NewNetworkPolicyBuilder().WithTypes("Egress").WithPodSelector(testutils.NewLabelSelectorBuilder().Build()).Build(),
					},
				},
				namespaces: []*corev1.Namespace{
					testutils.NewNamespaceBuilder().WithName("default").Build(),
				},
			},
			expectedAllowedRoute: &types.AllowedRoute{
				SourcePod:       types.PodRef{Name: "Pod1", Namespace: "default"},
				EgressPolicies:  []types.NetworkPolicy{},
				TargetPod:       types.PodRef{Name: "Pod2", Namespace: "default"},
				IngressPolicies: []types.NetworkPolicy{},
				Ports:           nil,
			},
		},
		{
			name: "a non isolated pod can send traffic to pod accepting its labels",
			args: args{
				sourcePodIsolation: shared.PodIsolation{
					Pod:             testutils.NewPodBuilder().WithName("Pod1").WithLabel("app", "foo").Build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies:  []*networkingv1.NetworkPolicy{},
				},
				targetPodIsolation: shared.PodIsolation{
					Pod: testutils.NewPodBuilder().WithName("Pod2").Build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{
						testutils.NewNetworkPolicyBuilder().WithName("in1").WithTypes("Ingress").WithIngressRule(networkingv1.NetworkPolicyIngressRule{
							From: []networkingv1.NetworkPolicyPeer{
								{
									PodSelector: testutils.NewLabelSelectorBuilder().WithMatchLabel("app", "foo").Build(),
								},
							},
						}).Build(),
					},
					EgressPolicies: []*networkingv1.NetworkPolicy{},
				},
				namespaces: []*corev1.Namespace{
					testutils.NewNamespaceBuilder().WithName("default").Build(),
				},
			},
			expectedAllowedRoute: &types.AllowedRoute{
				SourcePod:      types.PodRef{Name: "Pod1", Namespace: "default"},
				EgressPolicies: []types.NetworkPolicy{},
				TargetPod:      types.PodRef{Name: "Pod2", Namespace: "default"},
				IngressPolicies: []types.NetworkPolicy{
					{Name: "in1", Namespace: "default", Labels: map[string]string{}},
				},
				Ports: nil,
			},
		},
		{
			name: "a non isolated pod cannot send traffic to pod rejecting its labels",
			args: args{
				sourcePodIsolation: shared.PodIsolation{
					Pod:             testutils.NewPodBuilder().WithName("Pod1").WithLabel("app", "foo").Build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies:  []*networkingv1.NetworkPolicy{},
				},
				targetPodIsolation: shared.PodIsolation{
					Pod: testutils.NewPodBuilder().WithName("Pod2").Build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{
						testutils.NewNetworkPolicyBuilder().WithName("in1").WithTypes("Ingress").WithIngressRule(networkingv1.NetworkPolicyIngressRule{
							From: []networkingv1.NetworkPolicyPeer{
								{
									PodSelector: testutils.NewLabelSelectorBuilder().WithMatchLabel("app", "bar").Build(),
								},
							},
						}).Build(),
					},
					EgressPolicies: []*networkingv1.NetworkPolicy{},
				},
				namespaces: []*corev1.Namespace{
					testutils.NewNamespaceBuilder().WithName("default").Build(),
				},
			},
			expectedAllowedRoute: nil,
		},
		{
			name: "a non isolated pod can send traffic to pod accepting its namespace",
			args: args{
				sourcePodIsolation: shared.PodIsolation{
					Pod:             testutils.NewPodBuilder().WithName("Pod1").WithNamespace("ns").Build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies:  []*networkingv1.NetworkPolicy{},
				},
				targetPodIsolation: shared.PodIsolation{
					Pod: testutils.NewPodBuilder().WithName("Pod2").Build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{
						testutils.NewNetworkPolicyBuilder().WithName("in1").WithTypes("Ingress").WithIngressRule(networkingv1.NetworkPolicyIngressRule{
							From: []networkingv1.NetworkPolicyPeer{
								{
									NamespaceSelector: testutils.NewLabelSelectorBuilder().WithMatchLabel("name", "ns").Build(),
								},
							},
						}).Build(),
					},
					EgressPolicies: []*networkingv1.NetworkPolicy{},
				},
				namespaces: []*corev1.Namespace{
					testutils.NewNamespaceBuilder().WithName("ns").WithLabel("name", "ns").Build(),
				},
			},
			expectedAllowedRoute: &types.AllowedRoute{
				SourcePod:      types.PodRef{Name: "Pod1", Namespace: "ns"},
				EgressPolicies: []types.NetworkPolicy{},
				TargetPod:      types.PodRef{Name: "Pod2", Namespace: "default"},
				IngressPolicies: []types.NetworkPolicy{
					{Name: "in1", Namespace: "default", Labels: map[string]string{}},
				},
				Ports: nil,
			},
		},
		{
			name: "a non isolated pod cannot send traffic to pod rejecting its namespace",
			args: args{
				sourcePodIsolation: shared.PodIsolation{
					Pod:             testutils.NewPodBuilder().WithName("Pod1").WithNamespace("ns").Build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies:  []*networkingv1.NetworkPolicy{},
				},
				targetPodIsolation: shared.PodIsolation{
					Pod: testutils.NewPodBuilder().WithName("Pod2").Build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{
						testutils.NewNetworkPolicyBuilder().WithName("in1").WithTypes("Ingress").WithIngressRule(networkingv1.NetworkPolicyIngressRule{
							From: []networkingv1.NetworkPolicyPeer{
								{
									NamespaceSelector: testutils.NewLabelSelectorBuilder().WithMatchLabel("name", "other").Build(),
								},
							},
						}).Build(),
					},
					EgressPolicies: []*networkingv1.NetworkPolicy{},
				},
				namespaces: []*corev1.Namespace{
					testutils.NewNamespaceBuilder().WithName("ns").WithLabel("name", "ns").Build(),
				},
			},
			expectedAllowedRoute: nil,
		},
		{
			name: "a non isolated pod can send traffic to pod accepting both its labels and namespace",
			args: args{
				sourcePodIsolation: shared.PodIsolation{
					Pod:             testutils.NewPodBuilder().WithName("Pod1").WithNamespace("ns").WithLabel("app", "foo").Build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies:  []*networkingv1.NetworkPolicy{},
				},
				targetPodIsolation: shared.PodIsolation{
					Pod: testutils.NewPodBuilder().WithName("Pod2").Build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{
						testutils.NewNetworkPolicyBuilder().WithName("in1").WithTypes("Ingress").WithIngressRule(networkingv1.NetworkPolicyIngressRule{
							From: []networkingv1.NetworkPolicyPeer{
								{
									NamespaceSelector: testutils.NewLabelSelectorBuilder().WithMatchLabel("name", "ns").Build(),
									PodSelector:       testutils.NewLabelSelectorBuilder().WithMatchLabel("app", "foo").Build(),
								},
							},
						}).Build(),
					},
					EgressPolicies: []*networkingv1.NetworkPolicy{},
				},
				namespaces: []*corev1.Namespace{
					testutils.NewNamespaceBuilder().WithName("ns").WithLabel("name", "ns").Build(),
				},
			},
			expectedAllowedRoute: &types.AllowedRoute{
				SourcePod:      types.PodRef{Name: "Pod1", Namespace: "ns"},
				EgressPolicies: []types.NetworkPolicy{},
				TargetPod:      types.PodRef{Name: "Pod2", Namespace: "default"},
				IngressPolicies: []types.NetworkPolicy{
					{Name: "in1", Namespace: "default", Labels: map[string]string{}},
				},
				Ports: nil,
			},
		},
		{
			name: "a non isolated pod cannot send traffic to pod accepting its labels but not its namespace",
			args: args{
				sourcePodIsolation: shared.PodIsolation{
					Pod:             testutils.NewPodBuilder().WithName("Pod1").WithNamespace("ns").WithLabel("app", "foo").Build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies:  []*networkingv1.NetworkPolicy{},
				},
				targetPodIsolation: shared.PodIsolation{
					Pod: testutils.NewPodBuilder().WithName("Pod2").Build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{
						testutils.NewNetworkPolicyBuilder().WithName("in1").WithTypes("Ingress").WithIngressRule(networkingv1.NetworkPolicyIngressRule{
							From: []networkingv1.NetworkPolicyPeer{
								{
									NamespaceSelector: testutils.NewLabelSelectorBuilder().WithMatchLabel("name", "other").Build(),
									PodSelector:       testutils.NewLabelSelectorBuilder().WithMatchLabel("app", "foo").Build(),
								},
							},
						}).Build(),
					},
					EgressPolicies: []*networkingv1.NetworkPolicy{},
				},
				namespaces: []*corev1.Namespace{
					testutils.NewNamespaceBuilder().WithName("ns").WithLabel("name", "ns").Build(),
				},
			},
			expectedAllowedRoute: nil,
		},
		{
			name: "a non isolated pod cannot send traffic to pod accepting its namespace but not its labels",
			args: args{
				sourcePodIsolation: shared.PodIsolation{
					Pod:             testutils.NewPodBuilder().WithName("Pod1").WithNamespace("ns").WithLabel("app", "foo").Build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies:  []*networkingv1.NetworkPolicy{},
				},
				targetPodIsolation: shared.PodIsolation{
					Pod: testutils.NewPodBuilder().WithName("Pod2").Build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{
						testutils.NewNetworkPolicyBuilder().WithName("in1").WithTypes("Ingress").WithIngressRule(networkingv1.NetworkPolicyIngressRule{
							From: []networkingv1.NetworkPolicyPeer{
								{
									NamespaceSelector: testutils.NewLabelSelectorBuilder().WithMatchLabel("name", "ns").Build(),
									PodSelector:       testutils.NewLabelSelectorBuilder().WithMatchLabel("app", "bar").Build(),
								},
							},
						}).Build(),
					},
					EgressPolicies: []*networkingv1.NetworkPolicy{},
				},
				namespaces: []*corev1.Namespace{
					testutils.NewNamespaceBuilder().WithName("ns").WithLabel("name", "ns").Build(),
				},
			},
			expectedAllowedRoute: nil,
		},
		{
			name: "a non isolated pod can receive traffic from pod accepting its labels",
			args: args{
				sourcePodIsolation: shared.PodIsolation{
					Pod:             testutils.NewPodBuilder().WithName("Pod1").Build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies: []*networkingv1.NetworkPolicy{
						testutils.NewNetworkPolicyBuilder().WithName("eg1").WithTypes("Egress").WithEgressRule(networkingv1.NetworkPolicyEgressRule{
							To: []networkingv1.NetworkPolicyPeer{
								{
									PodSelector: testutils.NewLabelSelectorBuilder().WithMatchLabel("app", "foo").Build(),
								},
							},
						}).Build(),
					},
				},
				targetPodIsolation: shared.PodIsolation{
					Pod:             testutils.NewPodBuilder().WithName("Pod2").WithLabel("app", "foo").Build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies:  []*networkingv1.NetworkPolicy{},
				},
				namespaces: []*corev1.Namespace{
					testutils.NewNamespaceBuilder().WithName("default").Build(),
				},
			},
			expectedAllowedRoute: &types.AllowedRoute{
				SourcePod: types.PodRef{Name: "Pod1", Namespace: "default"},
				EgressPolicies: []types.NetworkPolicy{
					{Name: "eg1", Namespace: "default", Labels: map[string]string{}},
				},
				TargetPod:       types.PodRef{Name: "Pod2", Namespace: "default"},
				IngressPolicies: []types.NetworkPolicy{},
				Ports:           nil,
			},
		},
		{
			name: "a non isolated pod cannot receive traffic from pod rejecting its labels",
			args: args{
				sourcePodIsolation: shared.PodIsolation{
					Pod:             testutils.NewPodBuilder().WithName("Pod1").Build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies: []*networkingv1.NetworkPolicy{
						testutils.NewNetworkPolicyBuilder().WithName("eg1").WithTypes("Egress").WithEgressRule(networkingv1.NetworkPolicyEgressRule{
							To: []networkingv1.NetworkPolicyPeer{
								{
									PodSelector: testutils.NewLabelSelectorBuilder().WithMatchLabel("app", "bar").Build(),
								},
							},
						}).Build(),
					},
				},
				targetPodIsolation: shared.PodIsolation{
					Pod:             testutils.NewPodBuilder().WithName("Pod2").WithLabel("app", "foo").Build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies:  []*networkingv1.NetworkPolicy{},
				},
				namespaces: []*corev1.Namespace{
					testutils.NewNamespaceBuilder().WithName("default").Build(),
				},
			},
			expectedAllowedRoute: nil,
		},
		{
			name: "a non isolated pod can receive traffic from pod accepting its namespace",
			args: args{
				sourcePodIsolation: shared.PodIsolation{
					Pod:             testutils.NewPodBuilder().WithName("Pod1").Build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies: []*networkingv1.NetworkPolicy{
						testutils.NewNetworkPolicyBuilder().WithName("eg1").WithTypes("Egress").WithEgressRule(networkingv1.NetworkPolicyEgressRule{
							To: []networkingv1.NetworkPolicyPeer{
								{
									NamespaceSelector: testutils.NewLabelSelectorBuilder().WithMatchLabel("name", "ns").Build(),
								},
							},
						}).Build(),
					},
				},
				targetPodIsolation: shared.PodIsolation{
					Pod:             testutils.NewPodBuilder().WithName("Pod2").WithNamespace("ns").Build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies:  []*networkingv1.NetworkPolicy{},
				},
				namespaces: []*corev1.Namespace{
					testutils.NewNamespaceBuilder().WithName("ns").WithLabel("name", "ns").Build(),
				},
			},
			expectedAllowedRoute: &types.AllowedRoute{
				SourcePod: types.PodRef{Name: "Pod1", Namespace: "default"},
				EgressPolicies: []types.NetworkPolicy{
					{Name: "eg1", Namespace: "default", Labels: map[string]string{}},
				},
				TargetPod:       types.PodRef{Name: "Pod2", Namespace: "ns"},
				IngressPolicies: []types.NetworkPolicy{},
				Ports:           nil,
			},
		},
		{
			name: "a non isolated pod cannot receive traffic from pod rejecting its namespace",
			args: args{
				sourcePodIsolation: shared.PodIsolation{
					Pod:             testutils.NewPodBuilder().WithName("Pod1").Build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies: []*networkingv1.NetworkPolicy{
						testutils.NewNetworkPolicyBuilder().WithName("eg1").WithTypes("Egress").WithEgressRule(networkingv1.NetworkPolicyEgressRule{
							To: []networkingv1.NetworkPolicyPeer{
								{
									NamespaceSelector: testutils.NewLabelSelectorBuilder().WithMatchLabel("name", "other").Build(),
								},
							},
						}).Build(),
					},
				},
				targetPodIsolation: shared.PodIsolation{
					Pod:             testutils.NewPodBuilder().WithName("Pod2").WithName("ns").Build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies:  []*networkingv1.NetworkPolicy{},
				},
				namespaces: []*corev1.Namespace{
					testutils.NewNamespaceBuilder().WithName("ns").WithLabel("name", "ns").Build(),
				},
			},
			expectedAllowedRoute: nil,
		},
		{
			name: "a non isolated pod can receive traffic from pod accepting both its labels and namespace",
			args: args{
				sourcePodIsolation: shared.PodIsolation{
					Pod:             testutils.NewPodBuilder().WithName("Pod1").Build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies: []*networkingv1.NetworkPolicy{
						testutils.NewNetworkPolicyBuilder().WithName("eg1").WithTypes("Egress").WithEgressRule(networkingv1.NetworkPolicyEgressRule{
							To: []networkingv1.NetworkPolicyPeer{
								{
									NamespaceSelector: testutils.NewLabelSelectorBuilder().WithMatchLabel("name", "ns").Build(),
									PodSelector:       testutils.NewLabelSelectorBuilder().WithMatchLabel("app", "foo").Build(),
								},
							},
						}).Build(),
					},
				},
				targetPodIsolation: shared.PodIsolation{
					Pod:             testutils.NewPodBuilder().WithName("Pod2").WithNamespace("ns").WithLabel("app", "foo").Build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies:  []*networkingv1.NetworkPolicy{},
				},
				namespaces: []*corev1.Namespace{
					testutils.NewNamespaceBuilder().WithName("ns").WithLabel("name", "ns").Build(),
				},
			},
			expectedAllowedRoute: &types.AllowedRoute{
				SourcePod: types.PodRef{Name: "Pod1", Namespace: "default"},
				EgressPolicies: []types.NetworkPolicy{
					{
						Name:      "eg1",
						Namespace: "default",
						Labels:    map[string]string{},
					},
				},
				TargetPod:       types.PodRef{Name: "Pod2", Namespace: "ns"},
				IngressPolicies: []types.NetworkPolicy{},
				Ports:           nil,
			},
		},
		{
			name: "a non isolated pod cannot receive traffic from pod accepting its labels but not its namespace",
			args: args{
				sourcePodIsolation: shared.PodIsolation{
					Pod:             testutils.NewPodBuilder().WithName("Pod1").Build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies: []*networkingv1.NetworkPolicy{
						testutils.NewNetworkPolicyBuilder().WithName("eg1").WithTypes("Egress").WithEgressRule(networkingv1.NetworkPolicyEgressRule{
							To: []networkingv1.NetworkPolicyPeer{
								{
									NamespaceSelector: testutils.NewLabelSelectorBuilder().WithMatchLabel("name", "other").Build(),
									PodSelector:       testutils.NewLabelSelectorBuilder().WithMatchLabel("app", "foo").Build(),
								},
							},
						}).Build(),
					},
				},
				targetPodIsolation: shared.PodIsolation{
					Pod:             testutils.NewPodBuilder().WithName("Pod2").WithNamespace("ns").WithLabel("app", "foo").Build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies:  []*networkingv1.NetworkPolicy{},
				},
				namespaces: []*corev1.Namespace{
					testutils.NewNamespaceBuilder().WithName("ns").WithLabel("name", "ns").Build(),
				},
			},
			expectedAllowedRoute: nil,
		},
		{
			name: "a non isolated pod cannot receive traffic from pod accepting its namespace but not its labels",
			args: args{
				sourcePodIsolation: shared.PodIsolation{
					Pod:             testutils.NewPodBuilder().WithName("Pod1").Build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies: []*networkingv1.NetworkPolicy{
						testutils.NewNetworkPolicyBuilder().WithName("eg1").WithTypes("Egress").WithEgressRule(networkingv1.NetworkPolicyEgressRule{
							To: []networkingv1.NetworkPolicyPeer{
								{
									NamespaceSelector: testutils.NewLabelSelectorBuilder().WithMatchLabel("name", "ns").Build(),
									PodSelector:       testutils.NewLabelSelectorBuilder().WithMatchLabel("app", "bar").Build(),
								},
							},
						}).Build(),
					},
				},
				targetPodIsolation: shared.PodIsolation{
					Pod:             testutils.NewPodBuilder().WithName("Pod2").WithNamespace("ns").WithLabel("app", "foo").Build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies:  []*networkingv1.NetworkPolicy{},
				},
				namespaces: []*corev1.Namespace{
					testutils.NewNamespaceBuilder().WithName("ns").WithLabel("name", "ns").Build(),
				},
			},
			expectedAllowedRoute: nil,
		},
		{
			name: "allowed route ports are the intersection of ingress and egress rule ports",
			args: args{
				sourcePodIsolation: shared.PodIsolation{
					Pod:             testutils.NewPodBuilder().WithName("Pod1").Build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies: []*networkingv1.NetworkPolicy{
						testutils.NewNetworkPolicyBuilder().WithName("eg1").WithTypes("Egress").WithEgressRule(networkingv1.NetworkPolicyEgressRule{
							To: []networkingv1.NetworkPolicyPeer{
								{
									PodSelector: testutils.NewLabelSelectorBuilder().Build(),
								},
							},
							Ports: []networkingv1.NetworkPolicyPort{
								{Port: &intstr.IntOrString{IntVal: 80}},
								{Port: &intstr.IntOrString{IntVal: 8080}},
							},
						}).Build(),
					},
				},
				targetPodIsolation: shared.PodIsolation{
					Pod: testutils.NewPodBuilder().WithName("Pod2").Build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{
						testutils.NewNetworkPolicyBuilder().WithName("in1").WithTypes("Ingress").WithIngressRule(networkingv1.NetworkPolicyIngressRule{
							From: []networkingv1.NetworkPolicyPeer{
								{
									PodSelector: testutils.NewLabelSelectorBuilder().Build(),
								},
							},
							Ports: []networkingv1.NetworkPolicyPort{
								{Port: &intstr.IntOrString{IntVal: 443}},
								{Port: &intstr.IntOrString{IntVal: 80}},
							},
						}).Build(),
					},
					EgressPolicies: []*networkingv1.NetworkPolicy{},
				},
				namespaces: []*corev1.Namespace{
					testutils.NewNamespaceBuilder().WithName("default").Build(),
				},
			},
			expectedAllowedRoute: &types.AllowedRoute{
				SourcePod: types.PodRef{Name: "Pod1", Namespace: "default"},
				EgressPolicies: []types.NetworkPolicy{
					{Name: "eg1", Namespace: "default", Labels: map[string]string{}},
				},
				TargetPod: types.PodRef{Name: "Pod2", Namespace: "default"},
				IngressPolicies: []types.NetworkPolicy{
					{Name: "in1", Namespace: "default", Labels: map[string]string{}},
				},
				Ports: []int32{80},
			},
		},
		{
			name: "allowed route ports are ingress rule ports when egress applies to all ports",
			args: args{
				sourcePodIsolation: shared.PodIsolation{
					Pod:             testutils.NewPodBuilder().WithName("Pod1").Build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies: []*networkingv1.NetworkPolicy{
						testutils.NewNetworkPolicyBuilder().WithName("eg1").WithTypes("Egress").WithEgressRule(networkingv1.NetworkPolicyEgressRule{
							To: []networkingv1.NetworkPolicyPeer{
								{
									PodSelector: testutils.NewLabelSelectorBuilder().Build(),
								},
							},
						}).Build(),
					},
				},
				targetPodIsolation: shared.PodIsolation{
					Pod: testutils.NewPodBuilder().WithName("Pod2").Build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{
						testutils.NewNetworkPolicyBuilder().WithName("in1").WithTypes("Ingress").WithIngressRule(networkingv1.NetworkPolicyIngressRule{
							From: []networkingv1.NetworkPolicyPeer{
								{
									PodSelector: testutils.NewLabelSelectorBuilder().Build(),
								},
							},
							Ports: []networkingv1.NetworkPolicyPort{
								{Port: &intstr.IntOrString{IntVal: 443}},
								{Port: &intstr.IntOrString{IntVal: 80}},
							},
						}).Build(),
					},
					EgressPolicies: []*networkingv1.NetworkPolicy{},
				},
				namespaces: []*corev1.Namespace{
					testutils.NewNamespaceBuilder().WithName("default").Build(),
				},
			},
			expectedAllowedRoute: &types.AllowedRoute{
				SourcePod: types.PodRef{Name: "Pod1", Namespace: "default"},
				EgressPolicies: []types.NetworkPolicy{
					{Name: "eg1", Namespace: "default", Labels: map[string]string{}},
				},
				TargetPod: types.PodRef{Name: "Pod2", Namespace: "default"},
				IngressPolicies: []types.NetworkPolicy{
					{Name: "in1", Namespace: "default", Labels: map[string]string{}},
				},
				Ports: []int32{80, 443},
			},
		},
		{
			name: "allowed route ports are egress rule ports when ingress applies to all ports",
			args: args{
				sourcePodIsolation: shared.PodIsolation{
					Pod:             testutils.NewPodBuilder().WithName("Pod1").Build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies: []*networkingv1.NetworkPolicy{
						testutils.NewNetworkPolicyBuilder().WithName("eg1").WithTypes("Egress").WithEgressRule(networkingv1.NetworkPolicyEgressRule{
							To: []networkingv1.NetworkPolicyPeer{
								{
									PodSelector: testutils.NewLabelSelectorBuilder().Build(),
								},
							},
							Ports: []networkingv1.NetworkPolicyPort{
								{Port: &intstr.IntOrString{IntVal: 443}},
								{Port: &intstr.IntOrString{IntVal: 80}},
							},
						}).Build(),
					},
				},
				targetPodIsolation: shared.PodIsolation{
					Pod: testutils.NewPodBuilder().WithName("Pod2").Build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{
						testutils.NewNetworkPolicyBuilder().WithName("in1").WithTypes("Ingress").WithIngressRule(networkingv1.NetworkPolicyIngressRule{
							From: []networkingv1.NetworkPolicyPeer{
								{
									PodSelector: testutils.NewLabelSelectorBuilder().Build(),
								},
							},
						}).Build(),
					},
					EgressPolicies: []*networkingv1.NetworkPolicy{},
				},
				namespaces: []*corev1.Namespace{
					testutils.NewNamespaceBuilder().WithName("default").Build(),
				},
			},
			expectedAllowedRoute: &types.AllowedRoute{
				SourcePod: types.PodRef{Name: "Pod1", Namespace: "default"},
				EgressPolicies: []types.NetworkPolicy{
					{Name: "eg1", Namespace: "default", Labels: map[string]string{}},
				},
				TargetPod: types.PodRef{Name: "Pod2", Namespace: "default"},
				IngressPolicies: []types.NetworkPolicy{
					{Name: "in1", Namespace: "default", Labels: map[string]string{}},
				},
				Ports: []int32{80, 443},
			},
		},
		{
			name: "allowed route ports is nil when both ingress and egress apply to all ports",
			args: args{
				sourcePodIsolation: shared.PodIsolation{
					Pod:             testutils.NewPodBuilder().WithName("Pod1").Build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies: []*networkingv1.NetworkPolicy{
						testutils.NewNetworkPolicyBuilder().WithName("eg1").WithTypes("Egress").WithEgressRule(networkingv1.NetworkPolicyEgressRule{
							To: []networkingv1.NetworkPolicyPeer{
								{
									PodSelector: testutils.NewLabelSelectorBuilder().Build(),
								},
							},
						}).Build(),
					},
				},
				targetPodIsolation: shared.PodIsolation{
					Pod: testutils.NewPodBuilder().WithName("Pod2").Build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{
						testutils.NewNetworkPolicyBuilder().WithName("in1").WithTypes("Ingress").WithIngressRule(networkingv1.NetworkPolicyIngressRule{
							From: []networkingv1.NetworkPolicyPeer{
								{
									PodSelector: testutils.NewLabelSelectorBuilder().Build(),
								},
							},
						}).Build(),
					},
					EgressPolicies: []*networkingv1.NetworkPolicy{},
				},
				namespaces: []*corev1.Namespace{
					testutils.NewNamespaceBuilder().WithName("default").Build(),
				},
			},
			expectedAllowedRoute: &types.AllowedRoute{
				SourcePod: types.PodRef{Name: "Pod1", Namespace: "default"},
				EgressPolicies: []types.NetworkPolicy{
					{Name: "eg1", Namespace: "default", Labels: map[string]string{}},
				},
				TargetPod: types.PodRef{Name: "Pod2", Namespace: "default"},
				IngressPolicies: []types.NetworkPolicy{
					{Name: "in1", Namespace: "default", Labels: map[string]string{}},
				},
				Ports: nil,
			},
		},
		{
			name: "route is forbidden when ingress and egress have no ports in common",
			args: args{
				sourcePodIsolation: shared.PodIsolation{
					Pod:             testutils.NewPodBuilder().WithName("Pod1").Build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies: []*networkingv1.NetworkPolicy{
						testutils.NewNetworkPolicyBuilder().WithTypes("Egress").WithEgressRule(networkingv1.NetworkPolicyEgressRule{
							To: []networkingv1.NetworkPolicyPeer{
								{
									PodSelector: testutils.NewLabelSelectorBuilder().Build(),
								},
							},
							Ports: []networkingv1.NetworkPolicyPort{
								{Port: &intstr.IntOrString{IntVal: 80}},
							},
						}).Build(),
					},
				},
				targetPodIsolation: shared.PodIsolation{
					Pod: testutils.NewPodBuilder().WithName("Pod2").Build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{
						testutils.NewNetworkPolicyBuilder().WithTypes("Ingress").WithIngressRule(networkingv1.NetworkPolicyIngressRule{
							From: []networkingv1.NetworkPolicyPeer{
								{
									PodSelector: testutils.NewLabelSelectorBuilder().Build(),
								},
							},
							Ports: []networkingv1.NetworkPolicyPort{
								{Port: &intstr.IntOrString{IntVal: 443}},
							},
						}).Build(),
					},
					EgressPolicies: []*networkingv1.NetworkPolicy{},
				},
				namespaces: []*corev1.Namespace{
					testutils.NewNamespaceBuilder().WithName("default").Build(),
				},
			},
			expectedAllowedRoute: nil,
		},
		{
			name: "allowed route only contains policies with allowed ports",
			args: args{
				sourcePodIsolation: shared.PodIsolation{
					Pod:             testutils.NewPodBuilder().WithName("Pod1").Build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{},
					EgressPolicies: []*networkingv1.NetworkPolicy{
						testutils.NewNetworkPolicyBuilder().WithName("eg1").WithTypes("Egress").WithEgressRule(networkingv1.NetworkPolicyEgressRule{
							To: []networkingv1.NetworkPolicyPeer{
								{
									PodSelector: testutils.NewLabelSelectorBuilder().Build(),
								},
							},
							Ports: []networkingv1.NetworkPolicyPort{
								{Port: &intstr.IntOrString{IntVal: 80}},
							},
						}).Build(),
						testutils.NewNetworkPolicyBuilder().WithName("eg2").WithTypes("Egress").WithEgressRule(networkingv1.NetworkPolicyEgressRule{
							To: []networkingv1.NetworkPolicyPeer{
								{
									PodSelector: testutils.NewLabelSelectorBuilder().Build(),
								},
							},
							Ports: []networkingv1.NetworkPolicyPort{
								{Port: &intstr.IntOrString{IntVal: 5000}},
							},
						}).Build(),
					},
				},
				targetPodIsolation: shared.PodIsolation{
					Pod: testutils.NewPodBuilder().WithName("Pod2").Build(),
					IngressPolicies: []*networkingv1.NetworkPolicy{
						testutils.NewNetworkPolicyBuilder().WithName("in1").WithTypes("Ingress").WithIngressRule(networkingv1.NetworkPolicyIngressRule{
							From: []networkingv1.NetworkPolicyPeer{
								{
									PodSelector: testutils.NewLabelSelectorBuilder().Build(),
								},
							},
							Ports: []networkingv1.NetworkPolicyPort{
								{Port: &intstr.IntOrString{IntVal: 80}},
							},
						}).Build(),
						testutils.NewNetworkPolicyBuilder().WithName("in2").WithTypes("Ingress").WithIngressRule(networkingv1.NetworkPolicyIngressRule{
							From: []networkingv1.NetworkPolicyPeer{
								{
									PodSelector: testutils.NewLabelSelectorBuilder().Build(),
								},
							},
							Ports: []networkingv1.NetworkPolicyPort{
								{Port: &intstr.IntOrString{IntVal: 7000}},
							},
						}).Build(),
					},
					EgressPolicies: []*networkingv1.NetworkPolicy{},
				},
				namespaces: []*corev1.Namespace{
					testutils.NewNamespaceBuilder().WithName("default").Build(),
				},
			},
			expectedAllowedRoute: &types.AllowedRoute{
				SourcePod: types.PodRef{Name: "Pod1", Namespace: "default"},
				EgressPolicies: []types.NetworkPolicy{
					{Name: "eg1", Namespace: "default", Labels: map[string]string{}},
				},
				TargetPod: types.PodRef{Name: "Pod2", Namespace: "default"},
				IngressPolicies: []types.NetworkPolicy{
					{Name: "in1", Namespace: "default", Labels: map[string]string{}},
				},
				Ports: []int32{80},
			},
		},
	}
	for _, tt := range tests {
		analyzer := analyzerImpl{}
		allowedRoute := analyzer.Analyze(tt.args.sourcePodIsolation, tt.args.targetPodIsolation, tt.args.namespaces)
		t.Run(tt.name, func(t *testing.T) {
			if diff := cmp.Diff(tt.expectedAllowedRoute, allowedRoute); diff != "" {
				t.Errorf("Analyze() result mismatch (-want +got):\n%s", diff)
			}
		})
	}
}
