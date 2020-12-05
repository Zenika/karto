package ingress

import (
	"github.com/google/go-cmp/cmp"
	corev1 "k8s.io/api/core/v1"
	networkingv1beta1 "k8s.io/api/networking/v1beta1"
	"karto/testutils"
	"karto/types"
	"testing"
)

func TestAnalyze(t *testing.T) {
	type args struct {
		ingress  *networkingv1beta1.Ingress
		services []*corev1.Service
	}
	tests := []struct {
		name                              string
		args                              args
		expectedIngressWithTargetServices *types.Ingress
	}{
		{
			name: "ingress name and namespace are propagated",
			args: args{
				ingress:  testutils.NewIngressBuilder().WithName("ing").WithNamespace("ns").Build(),
				services: []*corev1.Service{},
			},
			expectedIngressWithTargetServices: &types.Ingress{
				Name:           "ing",
				Namespace:      "ns",
				TargetServices: []types.ServiceRef{},
			},
		},
		{
			name: "only services declared as ingress backends are detected as target",
			args: args{
				ingress: testutils.NewIngressBuilder().WithServiceBackend("svc1").WithServiceBackend("svc2").Build(),
				services: []*corev1.Service{
					testutils.NewServiceBuilder().WithName("svc1").Build(),
					testutils.NewServiceBuilder().WithName("svc2").Build(),
					testutils.NewServiceBuilder().WithName("svc3").Build(),
				},
			},
			expectedIngressWithTargetServices: &types.Ingress{
				Namespace: "default",
				TargetServices: []types.ServiceRef{
					{Name: "svc1", Namespace: "default"},
					{Name: "svc2", Namespace: "default"},
				},
			},
		},
		{
			name: "only services within the same namespace are detected as target",
			args: args{
				ingress: testutils.NewIngressBuilder().WithNamespace("ns").WithServiceBackend("svc1").Build(),
				services: []*corev1.Service{
					testutils.NewServiceBuilder().WithName("svc1").WithNamespace("ns").Build(),
					testutils.NewServiceBuilder().WithName("svc1").WithNamespace("other").Build(),
				},
			},
			expectedIngressWithTargetServices: &types.Ingress{
				Namespace: "ns",
				TargetServices: []types.ServiceRef{
					{Name: "svc1", Namespace: "ns"},
				},
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			analyzer := NewAnalyzer()
			ingressWithTargetServices := analyzer.Analyze(tt.args.ingress, tt.args.services)
			if diff := cmp.Diff(tt.expectedIngressWithTargetServices, ingressWithTargetServices); diff != "" {
				t.Errorf("Analyze() result mismatch (-want +got):\n%s", diff)
			}
		})
	}
}
