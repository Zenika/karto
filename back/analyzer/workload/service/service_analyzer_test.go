package service

import (
	"github.com/google/go-cmp/cmp"
	corev1 "k8s.io/api/core/v1"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"karto/testutils"
	"karto/types"
	"testing"
)

func Test_Analyze(t *testing.T) {
	type args struct {
		service *corev1.Service
		pods    []*corev1.Pod
	}
	tests := []struct {
		name                          string
		args                          args
		expectedServiceWithTargetPods *types.Service
	}{
		{
			name: "service name and namespace are propagated",
			args: args{
				service: testutils.NewServiceBuilder().WithName("svc").WithNamespace("ns").Build(),
				pods:    []*corev1.Pod{},
			},
			expectedServiceWithTargetPods: &types.Service{
				Name:       "svc",
				Namespace:  "ns",
				TargetPods: []types.PodRef{},
			},
		},
		{
			name: "only pods with matching labels are detected as target",
			args: args{
				service: testutils.NewServiceBuilder().WithSelectorLabel("app", "foo").Build(),
				pods: []*corev1.Pod{
					testutils.NewPodBuilder().WithName("name1").WithLabel("app", "foo").Build(),
					testutils.NewPodBuilder().WithName("name2").WithLabel("app", "bar").Build(),
				},
			},
			expectedServiceWithTargetPods: &types.Service{
				Namespace: "default",
				TargetPods: []types.PodRef{
					{Name: "name1", Namespace: "default"},
				},
			},
		},
		{
			name: "only pods within the same namespace are detected as target",
			args: args{
				service: testutils.NewServiceBuilder().WithNamespace("ns").WithSelectorLabel("app", "foo").Build(),
				pods: []*corev1.Pod{
					testutils.NewPodBuilder().WithName("name1").WithNamespace("ns").WithLabel("app", "foo").Build(),
					testutils.NewPodBuilder().WithName("name2").WithNamespace("other").WithLabel("app", "foo").Build(),
				},
			},
			expectedServiceWithTargetPods: &types.Service{
				Namespace: "ns",
				TargetPods: []types.PodRef{
					{Name: "name1", Namespace: "ns"},
				},
			},
		},
		{
			name: "service with no selector does not match any pod",
			args: args{
				service: &corev1.Service{
					ObjectMeta: v1.ObjectMeta{
						Namespace: "default",
					},
				},
				pods: []*corev1.Pod{
					testutils.NewPodBuilder().WithLabel("app", "foo").Build(),
					testutils.NewPodBuilder().WithLabel("app", "bar").Build(),
				},
			},
			expectedServiceWithTargetPods: &types.Service{
				Namespace:  "default",
				TargetPods: []types.PodRef{},
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			analyzer := NewAnalyzer()
			serviceWithTargetPods := analyzer.Analyze(tt.args.service, tt.args.pods)
			if diff := cmp.Diff(tt.expectedServiceWithTargetPods, serviceWithTargetPods); diff != "" {
				t.Errorf("Analyze() result mismatch (-want +got):\n%s", diff)
			}
		})
	}
}
