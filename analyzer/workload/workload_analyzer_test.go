package workload

import (
	"github.com/google/go-cmp/cmp"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"karto/testutils"
	"karto/types"
	"testing"
)

func Test_computeServiceWithTargetPods(t *testing.T) {
	type args struct {
		service *corev1.Service
		pods    []*corev1.Pod
	}
	tests := []struct {
		name                          string
		args                          args
		expectedServiceWithTargetPods types.Service
	}{
		{
			name: "service name and namespace are propagated",
			args: args{
				service: testutils.NewServiceBuilder().WithName("svc").WithNamespace("ns").Build(),
				pods:    []*corev1.Pod{},
			},
			expectedServiceWithTargetPods: types.Service{
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
			expectedServiceWithTargetPods: types.Service{
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
			expectedServiceWithTargetPods: types.Service{
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
			expectedServiceWithTargetPods: types.Service{
				Namespace:  "default",
				TargetPods: []types.PodRef{},
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			serviceWithTargetPods := serviceWithTargetPods(tt.args.service, tt.args.pods)
			if diff := cmp.Diff(tt.expectedServiceWithTargetPods, serviceWithTargetPods); diff != "" {
				t.Errorf("computeServiceWithTargetPods() result mismatch (-want +got):\n%s", diff)
			}
		})
	}
}

func Test_computeReplicaSetWithTargetPods(t *testing.T) {
	type args struct {
		replicaSet *appsv1.ReplicaSet
		pods       []*corev1.Pod
	}
	tests := []struct {
		name                             string
		args                             args
		expectedReplicaSetWithTargetPods *types.ReplicaSet
	}{
		{
			name: "replicaSet name and namespace are propagated",
			args: args{
				replicaSet: testutils.NewReplicaSetBuilder().WithName("rs").WithNamespace("ns").Build(),
				pods:       []*corev1.Pod{},
			},
			expectedReplicaSetWithTargetPods: &types.ReplicaSet{
				Name:       "rs",
				Namespace:  "ns",
				TargetPods: []types.PodRef{},
			},
		},
		{
			name: "replicaSets with 0 desired replicas are ignored",
			args: args{
				replicaSet: testutils.NewReplicaSetBuilder().WithDesiredReplicas(0).Build(),
				pods:       []*corev1.Pod{},
			},
			expectedReplicaSetWithTargetPods: nil,
		},
		{
			name: "only pods with matching labels are detected as target",
			args: args{
				replicaSet: testutils.NewReplicaSetBuilder().WithSelectorLabel("app", "foo").Build(),
				pods: []*corev1.Pod{
					testutils.NewPodBuilder().WithName("name1").WithLabel("app", "foo").Build(),
					testutils.NewPodBuilder().WithName("name2").WithLabel("app", "bar").Build(),
				},
			},
			expectedReplicaSetWithTargetPods: &types.ReplicaSet{
				Namespace: "default",
				TargetPods: []types.PodRef{
					{Name: "name1", Namespace: "default"},
				},
			},
		},
		{
			name: "only pods within the same namespace are detected as target",
			args: args{
				replicaSet: testutils.NewReplicaSetBuilder().WithNamespace("ns").WithSelectorLabel("app", "foo").Build(),
				pods: []*corev1.Pod{
					testutils.NewPodBuilder().WithName("name1").WithNamespace("ns").WithLabel("app", "foo").Build(),
					testutils.NewPodBuilder().WithName("name2").WithNamespace("other").WithLabel("app", "foo").Build(),
				},
			},
			expectedReplicaSetWithTargetPods: &types.ReplicaSet{
				Namespace: "ns",
				TargetPods: []types.PodRef{
					{Name: "name1", Namespace: "ns"},
				},
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			replicaSetWithTargetPods := replicaSetWithTargetPods(tt.args.replicaSet, tt.args.pods)
			if diff := cmp.Diff(tt.expectedReplicaSetWithTargetPods, replicaSetWithTargetPods); diff != "" {
				t.Errorf("computeReplicaSetWithTargetPods() result mismatch (-want +got):\n%s", diff)
			}
		})
	}
}

func Test_computeDeploymentWithTargetReplicaSets(t *testing.T) {
	type args struct {
		deployment  *appsv1.Deployment
		replicaSets []*appsv1.ReplicaSet
	}
	tests := []struct {
		name                                    string
		args                                    args
		expectedDeploymentWithTargetReplicaSets *types.Deployment
	}{
		{
			name: "deployment name and namespace are propagated",
			args: args{
				deployment:  testutils.NewDeploymentBuilder().WithName("deploy").WithNamespace("ns").Build(),
				replicaSets: []*appsv1.ReplicaSet{},
			},
			expectedDeploymentWithTargetReplicaSets: &types.Deployment{
				Name:              "deploy",
				Namespace:         "ns",
				TargetReplicaSets: []types.ReplicaSetRef{},
			},
		},
		{
			name: "only replicaSets referencing deployment as owner are detected as target",
			args: args{
				deployment: testutils.NewDeploymentBuilder().WithUID("deploy-uid").Build(),
				replicaSets: []*appsv1.ReplicaSet{
					testutils.NewReplicaSetBuilder().WithName("name1").WithOwnerDeployment("deploy-uid").WithDesiredReplicas(2).Build(),
					testutils.NewReplicaSetBuilder().WithName("name2").WithOwnerDeployment("other-uid").WithDesiredReplicas(2).Build(),
					testutils.NewReplicaSetBuilder().WithName("name3").Build(),
				},
			},
			expectedDeploymentWithTargetReplicaSets: &types.Deployment{
				Namespace: "default",
				TargetReplicaSets: []types.ReplicaSetRef{
					{Name: "name1", Namespace: "default"},
				},
			},
		},
		{
			name: "replicaSets with 0 desired replicas are ignored",
			args: args{
				deployment: testutils.NewDeploymentBuilder().WithUID("deploy-uid").Build(),
				replicaSets: []*appsv1.ReplicaSet{
					testutils.NewReplicaSetBuilder().WithName("name1").WithOwnerDeployment("deploy-uid").WithDesiredReplicas(2).Build(),
					testutils.NewReplicaSetBuilder().WithName("name2").WithOwnerDeployment("deploy-uid").WithDesiredReplicas(0).Build(),
				},
			},
			expectedDeploymentWithTargetReplicaSets: &types.Deployment{
				Namespace: "default",
				TargetReplicaSets: []types.ReplicaSetRef{
					{Name: "name1", Namespace: "default"},
				},
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			deploymentWithTargetReplicaSets := deploymentWithTargetReplicaSets(tt.args.deployment, tt.args.replicaSets)
			if diff := cmp.Diff(tt.expectedDeploymentWithTargetReplicaSets, deploymentWithTargetReplicaSets); diff != "" {
				t.Errorf("computeDeploymentWithTargetReplicaSets() result mismatch (-want +got):\n%s", diff)
			}
		})
	}
}
